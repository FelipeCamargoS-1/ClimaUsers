#!/bin/sh
set -eu

archive=/data/users.csv.tgz
mode=${1:-stream}
expected_member=${2:-}
member_cache=/tmp/climausers-users-csv-member

fail() {
  printf '%s\n' "ERRO no arquivo de usuarios: $*" >&2
  exit 1
}

validate_entries() {
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
}

[ -r "$archive" ] || fail "$archive nao existe ou nao pode ser lido pelo usuario postgres"

if [ "$mode" = "--fingerprint" ]; then
  sha256sum "$archive" | awk '{print $1}'
  exit 0
fi

if [ "$mode" = "--validate-only" ]; then
  validate_entries
  [ "$csv_entry" = "$expected_member" ] || fail "membro CSV diferente do configurado"
  exit 0
fi

case "$mode" in
  --prepare-fast-standard2) fast_format=standard2 ;;
  --prepare-fast-legacy4) fast_format=legacy4 ;;
  *) fast_format= ;;
esac
if [ -n "$fast_format" ]; then
  # O dataset oficial usa este membro fixo. A listagem completa roda em paralelo
  # com o COPY e qualquer divergencia faz o programa falhar e reverter o COPY.
  printf '%s\n%s\n%s\n' users.csv "$fast_format" concurrent > "$member_cache"
  printf '%s\n' "$fast_format"
  exit 0
fi

if [ "$mode" = "stream" ]; then
  [ -r "$member_cache" ] || fail "cache de validacao ausente; prepare antes do COPY"
  csv_entry=$(sed -n '1p' "$member_cache")
  archive_format=$(sed -n '2p' "$member_cache")
  validation_mode=$(sed -n '3p' "$member_cache")
  case "$csv_entry" in
    /*|../*|*/../*|*/..|..|*\\*) fail "entrada perigosa no cache" ;;
    *.csv|*.CSV) ;;
    *) fail "membro CSV invalido no cache" ;;
  esac

  validator_pid=
  if [ "$validation_mode" = concurrent ]; then
    "$0" --validate-only "$csv_entry" &
    validator_pid=$!
  fi

  # O header e validado na mesma passagem do COPY. Em erro, cat drena o fluxo
  # para o tar terminar normalmente e evitar SIGPIPE no processo do PostgreSQL.
  if tar -xOzf "$archive" -- "$csv_entry" | (
    IFS= read -r raw_header || fail "CSV vazio"
    header=$(printf '%s' "$raw_header" | sed 's/\r$//')
    valid=false
    case "$archive_format:$header" in
      standard2:name,email|legacy4:id,name,email,phone) valid=true ;;
    esac
    if [ "$valid" != true ]; then
      cat >/dev/null
      fail "cabecalho nao corresponde ao formato configurado: $archive_format"
    fi
    printf '%s\n' "$raw_header"
    cat
  ); then
    stream_status=0
  else
    stream_status=$?
  fi

  validator_status=0
  if [ -n "$validator_pid" ]; then
    if wait "$validator_pid"; then
      validator_status=0
    else
      validator_status=$?
    fi
  fi
  [ "$stream_status" -eq 0 ] || exit "$stream_status"
  [ "$validator_status" -eq 0 ] || exit "$validator_status"
  exit 0
fi

case "$mode" in
  --format) expected_format=auto ;;
  --prepare-standard2) expected_format=standard2 ;;
  --prepare-legacy4) expected_format=legacy4 ;;
  *) fail "modo desconhecido" ;;
esac

validate_entries
if [ "$expected_format" = auto ]; then
  # Fallback generico: consome tudo para evitar SIGPIPE no filho do PostgreSQL.
  header=$(tar -xOzf "$archive" -- "$csv_entry" | sed -n '1{s/\r$//;p;}')
  case "$header" in
    name,email) archive_format=standard2 ;;
    id,name,email,phone) archive_format=legacy4 ;;
    *) fail "cabecalho incompativel; esperado: name,email ou id,name,email,phone" ;;
  esac
else
  archive_format=$expected_format
fi

printf '%s\n%s\n%s\n' "$csv_entry" "$archive_format" serial > "$member_cache"
printf '%s\n' "$archive_format"
