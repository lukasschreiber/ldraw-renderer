String.prototype.normalize = function () {
    return this.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/-/g, '')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

String.prototype.compare = function (b, exact) {
    if (!exact) {
        return this.normalize().includes(b.normalize());
    } else {
        return this === b;
    }
};

String.prototype.syllables = function () {
    const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
    return this.match(syllableRegex) ?? [this];
}

String.prototype.introduceWhitespaces = function (mongo = false) {
    if(mongo) return this.syllables().join(".*");
    return new RegExp(this.syllables().join("[\\s-]*"), 'gi');
}

String.prototype.isQuoted = function () {
    let chars = this.split();
    return chars[0].match(/["']/g) && chars[chars.length - 1].match(/["']/g);
}

String.prototype.fixQuotes = function () {
    if(this.isQuoted()) return this;
    return `"${this.slice(1, -1)}"`; 
}