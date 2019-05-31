{
    "targets": [{
        "target_name": "module",
        "sources": [ "./src/module.c" ],
        "library_dirs": [
            '../lib'
        ],
        "libraries": [
            "<!@(pkg-config --libs libmtp libusb-1.0)"
        ],
        "cflags": [
            "<!@(pkg-config --cflags libmtp libusb-1.0)"
        ],
        "include_dirs": [
          "<!(node -e \"require('napi-macros')\")"
        ]
    }],
}
