{
    "targets": [{
        "target_name": "module",
        "sources": [ "./src/module.c" ],
        "library_dirs": [
            '../lib'
        ],
        "libraries": [
            '-lusb',
	    '-lmtp'
        ],
        "include_dirs": [
          "<!(node -e \"require('napi-macros')\")"
        ]
    }],
}
