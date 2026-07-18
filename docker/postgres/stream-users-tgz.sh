#!/bin/sh
set -eu

archive=/data/users.csv.tgz
mode=${1:-stream}
member_cache=/tmp/climausers-users-csv-member

fail() {
  printf '%s\n' "ERRO no arquivo de usuarios: $*" >&2
  exit 1
}

[ -r "$archive" ] || fail "$archive nao existe ou nao pode ser lido pelo usuario postgres"

# O hash nao precisa repetir a validacao estrutural; ela acontece antes do COPY.
if [ "$mode" = "--fingerprint" ]; then
  sha256sum "$archive" | awk '{print $1}'
  exit 0
fi

# O membro foi validado pelo --format na mesma execucao SQL e o bind mount e RO.
# Assim o COPY faz somente uma descompactacao do fluxo de dados.
if [ "$mode" = "stream" ]; then
  [ -r "$member_cache" ] || fail "cache de validacao ausente; execute --format antes do COPY"
  IFS= read -r csv_entry < "$member_cache"
  case "$csv_entry" in
    /*|../*|*/../*|*/..|..|*\\*) fail "entrada perigosa no cache" ;;
    *.csv|*.CSV) ;;
    *) fail "membro CSV invalido no cache" ;;
  esac
  exec tar -xOzf "$archive" -- "$csv_entry"
fi

[ "$mode" = "--format" ] || fail "modo desconhecido"

if ! entries=$(tar -tzf "$archive"); then
  fail "$archive nao e um TGZ valido"
fi
csv_count=0
csv_entry=
old_ifs=$IFS
IFS='
'
for entry in $entries; do
  case "$entry" in
    /*|../*|*/../*|*/..|..|*\\*) fail "entrada perigosa no TGZ: $entry" ;;
  esac
  case "$entry" in
    *.csv|*.CSV)
      csv_count=$((csv_count + 1))
      csv_entry=$entry
      ;;
  esac
done
IFS=$old_ifs

[ "$csv_count" -eq 1 ] || fail "esperado exatamente um CSV; encontrados: $csv_count"

# Nao encerre o pipe cedo: SIGPIPE em um filho de COPY FROM PROGRAM pode fazer o
# postmaster tratar a saida anormal como falha de processo. sed consome todo o CSV.
header=$(tar -xOzf "$archive" -- "$csv_entry" | sed -n '1{s/\r$//;p;}')
case "$header" in
  name,email) archive_format=standard2 ;;
  id,name,email,phone) archive_format=legacy4 ;;
  *) fail "cabecalho incompativel; esperado: name,email ou id,name,email,phone" ;;
esac

cache_tmp=$member_cache.$$
printf '%s\n' "$csv_entry" > "$cache_tmp"
mv -f "$cache_tmp" "$member_cache"
printf '%s\n' "$archive_format"
