if [ ! -f clips.js ]; then
    echo "no clips.js"
    exit 1
fi

# make a daily snapshot if not already there for today
today="$(date -u '+%Y-%m-%d')"
daily_name="daily-clips-$today.js"
if [ ! -f $daily_name ]; then
    rm -f daily-clips*.js
    echo "const dailyClipDate = '$today';" > $daily_name
    sed -e 's/const clips/const dailyClips/' clips.js >> $daily_name

    # update reference in index.html
    sed -e 's/src="daily-clips.*.js"/src="'$daily_name'"/' -i index.html
fi

