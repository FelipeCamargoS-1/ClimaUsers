#!/bin/sh
set -eu

archive=/data/users.csv.tgz
mode=${1:-stream}

fail() {
  printf '%s\n' "ERRO no arquivo de usuarios: $*" >&2
  exit 1
}

[ -r "$archive" ] || fail "$archive nao existe ou nao pode ser lido pelo usuario postgres"
tar -tzf "$archive" >/dev/null 2>&1 || fail "$archive nao e um TGZ valido"

entries=$(tar -tzf "$archive")
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

case "$mode" in
  --fingerprint)
    sha256sum "$archive" | awk '{print $1}'
    ;;
  --format)
    printf '%s\n' "$archive_format"
    ;;
  stream)
    exec tar -xOzf "$archive" -- "$csv_entry"
    ;;
  *) fail "modo desconhecido" ;;
esac
