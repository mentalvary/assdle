set -euo pipefail

function main() {
    echo "Building..."
    rm -rf build
    mkdir build
    cp -r src/media src/*.js src/*.css src/*.html build/

    # update version query string to bust cache
    ass_js_checksum=$(checksum src/ass.js)
    ass_css_checksum=$(checksum src/ass.css)
    clips_js_checksum=$(checksum src/clips.js)
    daily_clips_js_checksum=$(checksum src/daily-clips*js)
    dailies_js_checksum=$(checksum src/dailies.js)
    
    sed -r -i build/index.html \
        -e 's|src="(ass.js)"|src="\1?v='$ass_js_checksum'"|' \
        -e 's|src="(clips.js)"|src="\1?v='$clips_js_checksum'"|' \
        -e 's|src="(daily-clips.*js)"|src="\1?v='$daily_clips_js_checksum'"|' \
        -e 's|src="(dailies.js)"|src="\1?v='$dailies_js_checksum'"|' \
        -e 's|href="(ass.css)"|href="\1?v='$ass_css_checksum'"|'

    echo "Done."
}

function checksum() {
    sha256sum $1 | awk '{print $1}'
}

main

