// The original implementation of this class used real cookies, but that didn't work
// on iOS, so it was changed to this much, much simpler localStorage approach -- bam!
// Didn't even need to change the any calling code.
class Cookie {
    static get(name) {
        return localStorage.getItem(name);
    }

    static set(name, value) {
        localStorage.setItem(name, value.toString());
    }

    static remove(name, secure) {
        localStorage.removeItem(name);
    }
}

export { Cookie };
