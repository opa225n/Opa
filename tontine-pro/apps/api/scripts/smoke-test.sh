#!/usr/bin/env bash
# Script de fumée : parcourt le flux complet via l'API pour vérifier que tout s'enchaîne correctement.
set -euo pipefail
BASE="http://localhost:4000/v1"
j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)"; }

login() {
  local phone="$1"
  curl -s -X POST "$BASE/auth/otp/request" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\"}" > /tmp/otp.json
  local code; code=$(cat /tmp/otp.json | j "['devCode']")
  curl -s -X POST "$BASE/auth/otp/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\",\"code\":\"$code\"}"
}

echo "== Connexion président =="
PRES=$(login "+2250700000001")
PRES_TOKEN=$(echo "$PRES" | j "['accessToken']")
PRES_ID=$(echo "$PRES" | j "['user']['id']")
echo "président user_id=$PRES_ID"
curl -s -X PATCH "$BASE/me" -H "Authorization: Bearer $PRES_TOKEN" -H 'Content-Type: application/json' \
  -d '{"fullName":"Aya Koné","momoNumber":"+2250700000001","momoOperator":"orange","pin":"1234"}' > /dev/null

echo "== Connexion 2 membres =="
M2=$(login "+2250700000002"); M2_TOKEN=$(echo "$M2" | j "['accessToken']")
curl -s -X PATCH "$BASE/me" -H "Authorization: Bearer $M2_TOKEN" -H 'Content-Type: application/json' \
  -d '{"fullName":"Issa Bamba","momoNumber":"+2250700000002","momoOperator":"mtn","pin":"1234"}' > /dev/null
M3=$(login "+2250700000003"); M3_TOKEN=$(echo "$M3" | j "['accessToken']")
curl -s -X PATCH "$BASE/me" -H "Authorization: Bearer $M3_TOKEN" -H 'Content-Type: application/json' \
  -d '{"fullName":"Fatou Diabaté","momoNumber":"+2250700000003","momoOperator":"moov","pin":"1234"}' > /dev/null

echo "== Création tontine =="
TONTINE=$(curl -s -X POST "$BASE/tontines" -H "Authorization: Bearer $PRES_TOKEN" -H 'Content-Type: application/json' -d '{
  "name":"Tontine des Amies","contributionAmount":25000,"frequency":"weekly",
  "startDate":"2026-10-18","maxMembers":3,"penaltyType":"fixed","penaltyValue":1000
}')
TID=$(echo "$TONTINE" | j "['id']")
echo "tontine_id=$TID"

echo "== Invitations =="
INV2=$(curl -s -X POST "$BASE/tontines/$TID/invitations" -H "Authorization: Bearer $PRES_TOKEN")
TOKEN2=$(echo "$INV2" | j "['token']")
INV3=$(curl -s -X POST "$BASE/tontines/$TID/invitations" -H "Authorization: Bearer $PRES_TOKEN")
TOKEN3=$(echo "$INV3" | j "['token']")

curl -s -X POST "$BASE/invitations/$TOKEN2/accept" -H "Authorization: Bearer $M2_TOKEN" > /dev/null
curl -s -X POST "$BASE/invitations/$TOKEN3/accept" -H "Authorization: Bearer $M3_TOKEN" > /dev/null
echo "2 membres ont rejoint"

echo "== Tirage au sort + lancement du cycle =="
curl -s -X POST "$BASE/tontines/$TID/rotation-order" -H "Authorization: Bearer $PRES_TOKEN" -H 'Content-Type: application/json' -d '{"mode":"lottery"}' > /dev/null
START=$(curl -s -X POST "$BASE/tontines/$TID/start" -H "Authorization: Bearer $PRES_TOKEN")
echo "$START" | j "['currentRound']"

echo "== Paiement de la cotisation du tour 1 pour les 3 membres =="
ROUNDS=$(curl -s "$BASE/tontines/$TID/rounds" -H "Authorization: Bearer $PRES_TOKEN")
ROUND1_ID=$(echo "$ROUNDS" | j "[0]['id']")
echo "round1_id=$ROUND1_ID"

pay_all() {
  local token="$1"
  local contribs; contribs=$(curl -s "$BASE/rounds/$ROUND1_ID/contributions" -H "Authorization: Bearer $token")
  python3 -c "
import sys,json
d=json.load(sys.stdin)
for c in d['contributions']:
    if c['isSelf']:
        print(c['id'])
" <<< "$contribs"
}

for TOKEN in "$PRES_TOKEN" "$M2_TOKEN" "$M3_TOKEN"; do
  CID=$(pay_all "$TOKEN")
  echo "paiement contribution=$CID"
  curl -s -X POST "$BASE/contributions/$CID/pay" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"operator":"orange","momoNumber":"+2250700000099"}' > /dev/null
done

echo "== Attente confirmation webhooks simulés (6s) =="
sleep 6

echo "== État du tour 1 après paiements =="
curl -s "$BASE/rounds/$ROUND1_ID/contributions" -H "Authorization: Bearer $PRES_TOKEN" | python3 -m json.tool

echo "== Tours de la tontine =="
curl -s "$BASE/tontines/$TID/rounds" -H "Authorization: Bearer $PRES_TOKEN" | python3 -m json.tool

echo "== Notifications du président =="
curl -s "$BASE/notifications" -H "Authorization: Bearer $PRES_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for n in d[:8]:
    print(n['type'], '-', n['title'])
"

echo "OK — parcours complet exécuté sans erreur."
