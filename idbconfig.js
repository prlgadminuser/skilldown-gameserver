

const password = process.env.DB_KEY || "8RLj5Vr3F6DRBAYc"
const encodedPassword = encodeURIComponent(password);

const lgconnecturi = `mongodb+srv://Liquem:${encodedPassword}@cluster0.ed4zami.mongodb.net/?retryWrites=true&w=majority`;

const uri = lgconnecturi

module.exports = {
   uri
}