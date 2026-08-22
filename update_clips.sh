if [ ! -f clips.js ]; then
    echo "no clips.js"
    exit 1
fi

# make a daily snapshot if not already there for today
today="$(date -u '+%Y-%m-%d')"
daily_name="daily-clips-$today.js"
if [ ! -f $daily_name ]; then
    rm -f daily-clips*.js
    sed -e 's/const clips/const dailyClips/' clips-*.js > $daily_name
    echo "const dailyClipDate = '$today';" >> $daily_name

    sed -e 's/src="daily-clips.*.js"/src="'$daily_name'"/' -i index.html
fi

rm -f clips-*.js
new_name="clips-$(sha256sum clips.js | awk '{print $1}').js"
mv clips.js $new_name
sed -e 's/src="clips.*.js"/src="'$new_name'"/' -i index.html