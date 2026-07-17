FROM postgres:16-alpine

# GNU tar fornece comportamento previsivel para validar e transmitir o TGZ.
RUN apk add --no-cache tar coreutils

COPY docker/postgres/stream-users-tgz.sh /usr/local/bin/climausers-users-archive
RUN chmod 0555 /usr/local/bin/climausers-users-archive
