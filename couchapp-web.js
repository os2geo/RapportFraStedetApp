var ddoc = {
    _id: '_design/web-1',
    rewrites: [
        {
            "from": "/",
            "to": "index.html"
        },
        {
            "from": "/*",
            "to": "*"
        }
    ]
};
module.exports = ddoc;
