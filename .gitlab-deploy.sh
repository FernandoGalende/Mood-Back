#! /bin/bash

green="\e[32m"
end="\e[0m"

if [[ $# -ne 13 ]]
then
    printf "${green}Usage:${end} $(basename $0) audience issuer jwks_uri aws_access_key_id aws_secret_access_key general_mood_table_name suggestions_mood_table kudos_table auth_domain client_id_mgmt client_secret_mgmt audience_mgmt users_table\n "
    exit 2
else
    printf "Getting info from arguments\n"
    AUDIENCE=$1
    ISSUER=$2
    JWKS_URI=$3
    AWS_ACCESS_KEY_ID=$4
    AWS_SECRET_ACCESS_KEY=$5
    GENERAL_MOOD_TABLE=$6
    SUGGESTIONS_MOOD_TABLE=$7
    KUDOS_TABLE=$8
    AUTH0_DOMAIN_MGMT=$9
    CLIENT_ID_MGMT=${10}
    CLIENT_SECRET_MGMT=${11}
    AUDIENCE_MGMT=${12}
    USERS_TABLE=${13}
fi

printf "Stopping docker while we rebuild"
docker stop mood && docker rm mood

printf "Building new docker image"
docker build -t mood-back .

printf "Running docker image"
docker run -d\
    -p 3000:3000 \
    --name mood \
    -e "AUDIENCE_AUTH0=$AUDIENCE" \
    -e "ISSUER_AUTH0=$ISSUER" \
    -e "JWKS_URI=$JWKS_URI" \
    -e "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" \
    -e "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" \
    -e "GENERAL_MOOD_TABLE=$GENERAL_MOOD_TABLE" \
    -e "SUGGESTIONS_MOOD_TABLE=$SUGGESTIONS_MOOD_TABLE" \
    -e "KUDOS_TABLE=$KUDOS_TABLE" \
    -e "AUTH0_DOMAIN_MGMT=$AUTH0_DOMAIN_MGMT" \
    -e "CLIENT_ID_MGMT=$CLIENT_ID_MGMT" \
    -e "CLIENT_SECRET_MGMT=$CLIENT_SECRET_MGMT" \
    -e "AUDIENCE_MGMT=$AUDIENCE_MGMT" \
    -e "USERS_TABLE=$USERS_TABLE" \
    mood-back

printf "Removing docker images older than 7 days"
docker image prune --filter "until=168h"

echo "Done!"
exit 0
