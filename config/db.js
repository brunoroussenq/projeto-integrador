require('dotenv').config();
const mysql = require('mysql2');

// Configuração condicional de SSL
// O filess.io exige SSL, mas aceita certificados autoassinados/intermediários
// se desativarmos a rejeição estrita (rejectUnauthorized: false).
const sslConfig = process.env.DB_SSL === 'true' 
  ? { rejectUnauthorized: false } 
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Teste imediato de conectividade com tratamento de erro
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erro crítico ao conectar ao MySQL:', err.code, err.message);
  } else {
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    connection.release();
  }
});

// Exporta a versão com Promises (útil para async/await nas rotas)
module.exports = pool.promise();
