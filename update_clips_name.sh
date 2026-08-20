if [ -f clips.js ]; then
    rm clips-*.js
fi

new_name="clips-$(sha256sum clips*.js | awk '{print $1}').js"
mv clips*.js $new_name
sed -e 's/src="clips.*.js"/src="'$new_name'"/' -i index.html