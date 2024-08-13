// The original implementation of this class used real cookies, but that didn't work
// on iOS, so it was changed to this much, much simpler localStorage approach -- bam!
// Didn't even need to change the any calling code.
class Cookie {
    static get(name) {
        return localStorage.getItem(name);
    }

    static getBoolean(name) {
        return Cookie.get(name) === "true";
    }

    static getInt(name) {
        const strVal = Cookie.get(name);
        return strVal ? parseInt(strVal) : null;
    }

    static getJsonOrElse(name, defaultVal=null) {
        const strVal = Cookie.get(name);
        if (strVal) {
            return JSON.parse(strVal);
        } else {
            return defaultVal;
        }
    }

    static remove(name, secure) {
        localStorage.removeItem(name);
    }

    static save(name, value) {
        localStorage.setItem(name, value.toString());
    }

    static saveInt(name, intVal) {
        Cookie.save(name, intVal);
    }

    static saveJson(name, val) {
        Cookie.save(name, JSON.stringify(val));
    }
}

export { Cookie };
