class Cookie {
    // TODO: Change when we decide on hosting.
    static DOMAIN   = "localhost";
    static PATH     = "/";

    // For now, don't do secure.
    static SECURE   = "; secure";
    static SECURE   = "";

    // Cookies expire in one year from now; calculate a year in milliseconds. 
    static EXPIRATION_DURATION = 365 * 24 * 60 * 60 * 1000;

    static get(name) {
        const cookieName = `${encodeURIComponent(name)}=`;
        const cookie = document.cookie;
        let value = null;

        const startIndex = cookie.indexOf(cookieName);
        if (startIndex > -1) {
            let endIndex = cookie.indexOf(';', startIndex);
            if (endIndex == -1) {
                endIndex = cookie.length;
            }
            value = decodeURIComponent(
                // Add one to name.length to get past the '=';
                cookie.substring(startIndex + name.length + 1, endIndex)
            );
        }
        return value;
    }

    static set(name, value, expires=null) {
        value = value.toString();
        let cookieText = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

        let expiration;
        if (expires instanceof Date) {
            expiration = expires;
        } else {
            expiration = new Date(Date.now() + Cookie.EXPIRATION_DURATION);
        }

        cookieText += `; expires=${expiration.toUTCString()}`;
        cookieText += `; path=${Cookie.PATH}`;
        cookieText += `; domain=${Cookie.DOMAIN}`;
        cookieText += `${Cookie.SECURE}`;

        document.cookie = cookieText;
    }

    static remove(name, secure) {
        Cookie.set(name, '', new Date(0));
    }
}

export { Cookie };
