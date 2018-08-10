{
    "targets": [{
        "target_name": "module",
        "sources": [ "./src/module.c" ],
        "libraries": [
            "<!@(pkg-config --libs libmtp)"
        ],
        "cflags": [
            "<!@(pkg-config --cflags libmtp)"
        ],
        "include_dirs": [
          "<!(node -e \"require('napi-macros')\")"
        ]
    }],
}
