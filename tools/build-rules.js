#!/usr/bin/env node
/* Writes database.rules.json. The rules are generated because the same conditions (signed in / not banned / maintenance) repeat on many paths.
   Edit HERE, run  node tools/build-rules.js , then  firebase deploy --only database .

   THE IDEA: a browser may only write things that cannot make anybody richer.
     - econ, flags, audit, bans, meta, leaderboards, win/loss records, ownerUids ...  -> ".write": false  (only Cloud Functions, which bypass rules, write them)
     - matchmaking / match state / parties / presence                               -> writable by signed-in, not-banned players (needed to play)      */
const fs=require('fs'),path=require('path');
const AUTH="auth != null";
const REAL="auth != null && auth.provider != 'anonymous'";
const OWNER="auth != null && (root.child('ownerUids').child(auth.uid).val() === true || root.child('ownerUids').child(auth.uid).val() === 1)";
const NOBAN="(!root.child('bans').child(auth.uid).exists() || (root.child('bans').child(auth.uid).child('until').val() > 0 && root.child('bans').child(auth.uid).child('until').val() < now))";
const OPEN="(root.child('meta').child('maint').child('on').val() !== true || (root.child('ownerUids').child(auth.uid).val() === true || root.child('ownerUids').child(auth.uid).val() === 1))";
const PLAY=`${AUTH} && ${NOBAN} && ${OPEN}`;
const SELF="auth != null && auth.uid === $uid";
const num=(k,lo,hi)=>`newData.child('${k}').isNumber() && newData.child('${k}').val() >= ${lo} && newData.child('${k}').val() <= ${hi}`;
const D=k=>`data.child('${k}').val()`,N=k=>`newData.child('${k}').val()`;
const rules={rules:{
 ".read":false,".write":false,
 lbhide:{".read":OWNER,".write":OWNER},   /* owners keep a player off the boards (/lbremove). From here on OWNERS may also write the paths the owner commands touch (marked OWNER-WRITE), so the dashboard works directly from an owner's browser when the Cloud Function is not deployed (js/ownerlocal.js). Nobody else can. */
 ownerUids:{".read":OWNER,$uid:{".read":SELF}},                                             /* you may ask "am I an owner?"; nobody can write the list from the game */
 econ:{$uid:{".read":`${SELF} || (${OWNER})`,".write":OWNER}},   /* OWNER-WRITE */                               /* balances, items, passes: SERVER ONLY */
 saves:{$uid:{".read":`${SELF} || (${OWNER})`}},                              /* the old client-written save: frozen, read once by the server to migrate */
 prefs:{$uid:{".read":SELF,".write":`${SELF} && auth.provider != 'anonymous'`,".validate":"newData.hasChildren(['d']) && newData.child('d').isString() && newData.child('d').val().length < 30000",t:{".validate":"newData.val() === now"},d:{},$o:{".validate":false}}},
 users:{".read":AUTH,".indexOn":["name"],$uid:{".write":OWNER,name:{".write":SELF,".validate":"newData.isString() && newData.val().length >= 1 && newData.val().length <= 24"}}},
 presence:{".read":AUTH,$uid:{".write":SELF,".validate":"newData.val() === true"}},
 meta:{".read":AUTH,".write":OWNER},   /* OWNER-WRITE: announce / maintenance / event */
 bans:{".read":OWNER,$uid:{".read":`${SELF} || (${OWNER})`,".write":OWNER}},   /* OWNER-WRITE */
 kicks:{$uid:{".read":SELF,".write":`(${SELF} && !newData.exists()) || (${OWNER})`}},
 inbox:{$uid:{".read":SELF,$id:{".write":`(${SELF} && !newData.exists()) || (${OWNER})`}}},
 gifts:{},                                                                    /* legacy path, closed */
 flags:{".read":OWNER,".write":OWNER},audit:{".read":OWNER,".write":OWNER},adminRate:{$uid:{".read":`${SELF} && (${OWNER})`,".write":`${SELF} && (${OWNER})`}},
 cheats:{".read":OWNER,$uid:{$id:{".write":`${SELF} && !data.exists()`,".validate":"newData.hasChildren(['t','r']) && newData.child('t').val() === now && newData.child('r').isString() && newData.child('r').val().length <= 80",t:{},r:{},n:{".validate":"newData.isString() && newData.val().length <= 40"},$o:{".validate":false}}}},
 iplogs:{".read":OWNER,".indexOn":["last"],$uid:{".write":SELF}},
 trolls:{$uid:{".read":SELF,$id:{".write":`(${OWNER} && !data.exists()) || (${SELF} && !newData.exists())`,".validate":"newData.child('by').val() === auth.uid"}}},
 /* ---- matchmaking + live match state (peer to peer by design: nothing here can change a balance) ---- */
 lobby:{waiting:{".read":AUTH,".write":PLAY,".validate":"newData.child('uid').val() === auth.uid"}},
 lobby2:{q:{".read":AUTH,".write":PLAY}},
 rankq:{".read":OWNER,$md:{".read":AUTH,".write":`${PLAY} && auth.provider != 'anonymous'`}},
 rooms:{".read":OWNER,$md:{".read":AUTH,".write":PLAY}},
 invites:{$uid:{".read":SELF,".write":`${SELF} || (${PLAY})`}},
 matches:{$mid:{".read":AUTH,".write":PLAY}},
 /* ---- parties ---- */
 parties:{".read":OWNER,$code:{
  ".read":AUTH,
  ".write":`${AUTH} && ((!data.exists() && ${NOBAN} && newData.child('lead').val() === auth.uid && newData.child('m').child(auth.uid).exists()) || data.child('lead').val() === auth.uid || (data.exists() && !newData.exists() && !data.child('m').exists()))`,
  ".validate":"newData.hasChildren(['lead'])",
  /* leadership: the leader hands it over (rule above), or - when the leader is gone from the member list - a remaining member may take it for someone who IS in the list */
  lead:{".write":`${AUTH} && data.parent().child('m').child(auth.uid).exists() && !data.parent().child('m').child(data.val()).exists() && newData.exists()`,".validate":"newData.isString() && newData.parent().child('m').child(newData.val()).exists()"},
  priv:{".validate":"newData.val() === 0 || newData.val() === 1"},t:{".validate":"newData.isNumber()"},
  m:{$uid:{
   /* join: yourself only, not banned, not kicked from this party, and (open party OR you hold an invitation). leave / update: always yourself */
   ".write":`${SELF} && (!newData.exists() || data.exists() || (data.parent().parent().child('lead').exists() && ${NOBAN} && !data.parent().parent().child('ban').child(auth.uid).exists() && (data.parent().parent().child('priv').val() !== 1 || data.parent().parent().child('inv').child(auth.uid).exists())))`,
   ".validate":"newData.child('name').isString() && newData.child('name').val().length <= 24 && newData.child('skin').isNumber()"}},
  inv:{$uid:{".write":`${AUTH} && ((${SELF} && !newData.exists()) || (data.parent().parent().child('priv').val() !== 1 && data.parent().parent().child('m').child(auth.uid).exists()))`,".validate":"newData.val() === true"}},
  ban:{$uid:{".validate":"newData.val() === true"}},
  $o:{".validate":false}}},
 /* party invitations: pinv/<to>/<from>. One slot per sender, so a player can never be spammed with duplicates from the same person */
 pinv:{$uid:{".read":SELF,$from:{
  ".write":`${AUTH} && ((${SELF} && !newData.exists()) || (auth.uid === $from && ${NOBAN} && (!newData.exists() || root.child('parties').child(newData.child('code').val()).child('m').child(auth.uid).exists())))`,
  ".validate":"newData.hasChildren(['code','name','t']) && newData.child('code').isString() && newData.child('code').val().length <= 8 && newData.child('name').isString() && newData.child('name').val().length <= 24 && newData.child('t').val() === now",code:{},name:{},t:{},$o:{".validate":false}}}},
 /* ---- leaderboards: written by the server after it has validated a match ---- */
 halloween26v2:{lb:{".read":AUTH,".write":OWNER,".indexOn":["c","d"]}},
 arenaStats:{lb:{".read":AUTH,".write":OWNER,".indexOn":["k","dm"]}},
 /* ranked rating is still reported by the players' own games (there is no dedicated game server), so the rules bound it:
    one result per write, at most one write every 20 s, a rating can move 130 points per result at most, and placements cannot exceed Gold 3 */
 ranked:{$season:{lb:{".read":AUTH,".indexOn":["e"],$uid:{
  ".write":`(${SELF} && auth.provider != 'anonymous' && ${NOBAN} && !root.child('lbhide').child(auth.uid).child('r').exists() && newData.exists()) || (${OWNER})`,
  ".validate":`newData.hasChildren(['g','t','r']) && ${N('t')} === now && ${num('r',0,9999)} && ${num('g',1,100000)} && ${N('w')} + ${N('l')} <= ${N('g')} && (!newData.child('e').exists() || ${N('e')} <= ${N('r')}) && (!newData.child('n').exists() || (newData.child('n').isString() && ${N('n')}.length <= 14))`
   +` && (data.exists() ? (${N('g')} === ${D('g')} + 1 && now - ${D('t')} > 20000 && (${D('pl')} < 5 ? ${N('r')} <= 899 : (${N('r')} - ${D('r')} <= 130 && ${D('r')} - ${N('r')} <= 130)) && ${N('pk')} <= (${D('pk')} > ${N('r')} ? ${D('pk')} : ${N('r')})) : (${N('g')} === 1 && ${N('r')} <= 899 && ${N('pk')} <= ${N('r')}))`}}}}
}};
const strip=o=>{for(const k in o){if(o[k]&&typeof o[k]=='object')strip(o[k])}return o};
fs.writeFileSync(path.join(__dirname,'..','database.rules.json'),JSON.stringify(strip(rules),null,1)+'\n');
console.log('database.rules.json written');
