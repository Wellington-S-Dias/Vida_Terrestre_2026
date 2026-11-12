const mysql = require("mysql2");
const bcrypt = require("bcrypt");

class Usuarios {
  static connect() {
    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "vida_terrestre", //fazer
    });
    connection.connect();
    return connection;
  }

  static async addUsuario(usuario, callback) {
    const connection = Usuarios.connect();
    var { name, email, password } = usuario;

    if (!name || !email || !password) {
      return callback({ error: "Preencha todos os campo corretamente" });
    }

    usuario.password = await bcrypt.hash(usuario.password, 10);
    var sql = "insert into usuario set ?";
    connection.query(sql, usuario, (error, results) => {
      if (error) throw error;

      callback({ message: "Usuário cadastrado com sucesso!" });
    });
    connection.end();
  }

  static login(usuario, callback) {
    const connection = Usuarios.connect();
    var { email, password } = usuario;

    if (!email || !password) {
      return callback({ error: "Preencha todos os campos corretamente" });
    }
    var sql = "select id,name,email,password from usuario where email=?";
    connection.query(sql, email, (error, results) => {
      if (error) throw error;

      if (results.length == 0) {
        return callback({ error: "Usuário não Cadastrado" });
      }
      var user = results[0];
      const passwordVali = bcrypt.compareSync(usuario.password, user.password);
      if (user.email == usuario.email && passwordVali) {
        return callback({
          message: "Logado com sucesso!",
          usuario: { id: user.id, name: user.name, email: user.email },
        });
      }
      return callback({ error: "Usuário ou senha incorreta" });
    });
    connection.end();
  }

  static newPassword(senha, callback) {
    const connection = Usuarios.connect();
  }
}
module.exports = Usuarios;
