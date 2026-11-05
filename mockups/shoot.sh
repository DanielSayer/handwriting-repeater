#!/usr/bin/env bash
# usage: ./shoot.sh name [w h]
cd "$(dirname "$0")"
w=${2:-1440}; h=${3:-900}
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=$w,$h --screenshot="$(cygpath -w "$PWD/shots/$1-$w.png")" "file:///$(cygpath -m "$PWD/$1.html")" 2>/dev/null
