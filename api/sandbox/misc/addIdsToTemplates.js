// change the folders var to include the path to templates
const fs = require('fs');
const replaceInFile = (path) => {
    console.log(path)
    fs.readFile(path, 'utf8', (err, data) => {
        // Div Tags
        const tags = ['<div', '<ul', '<li', '<h3', '<h4', '<h5', '<a ', '<button', '<p ', '<span', 
        '<table', '<tr', '<tbody', '<td',
        '<form', '<input', '<label', '<pagination', '<nav '
    ]
        
        tags.forEach((tag) => {
            let regex = new RegExp(tag, "gi"); 
            let result;
            while ( (result = regex.exec(data)) ) {
                // Only add an ID to tags that don't have one already
                const enclosure = data.substring(result.index, data.indexOf('>', result.index));
                if (enclosure.indexOf('id=') === -1 && enclosure.indexOf('ng-repeat=') === -1){
                    data = data.replaceBetween(result.index, result.index + tag.length, `${tag}${tag.indexOf(' ') !== -1 ? '' : ' '}id="CUR-${randomString(8)}" `);
                }
            }
        })
    
        fs.writeFile(path, data, err => {
            console.log('Done writing ', path);
        });
    });
}
const folders = '< add path to templates folder here >';
fs.readdirSync(folders).forEach((folder) => {
    const ignore = ['.DS_Store', 'directives'];
    if (ignore.indexOf(folder) === -1) {
        fs.readdirSync(`${folders}/${folder}`).forEach((file) => {
            if (file.indexOf('.html') !== -1) {
                const path = `${folders}/${folder}/${file}`;
                replaceInFile(path);
            }
        })
    }
})
String.prototype.replaceBetween = function(start, end, what) {
    return this.substring(0, start) + what + this.substring(end);
};
const randomString = (stringLength) => {
    const length = stringLength || (Math.floor(Math.random() * 11) + 10); // default to string length of 10 - 20 characters
    const randomString = new Array(length).fill().map(() => {
        const randomNumber = Math.random() * 52; // 2 * 26 chars
        return String.fromCharCode(randomNumber + (randomNumber > 26 ? 71 : 65)); // add 65 for upper case, 71 (97 - 26) for lower case letters
    }).join('');
    return randomString;
}