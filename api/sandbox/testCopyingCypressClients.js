const url = "http://localhost:8081/clients/cypress-token?applicationToken=DrLmNC2q9t&userId=62c6e846ea9f250022d9965a&clientId=621f0baafa73b800413c5d4f";

for (let index = 0; index < 1; index++) {
    fetch(url)
    .then((response) => response.text())
    .then((body) => {
        console.log(body);
    }); 
}