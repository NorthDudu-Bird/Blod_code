require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 文件上传目录

// 路由引入
app.use('/api', require('./routes/posts'));

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 数据库连接测试
async function testDbConnection() {
  try {
    await db.query('SELECT 1');
    console.log('数据库连接成功');
    return true;
  } catch (err) {
    console.error('数据库连接失败:', err.message);
    return false;
  }
}

// 健康检查端点
app.get('/api/health', async (req, res) => {
  const dbHealthy = await testDbConnection();
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    dbConnection: dbHealthy
  });
});

// 启动服务器前测试数据库连接
testDbConnection().then(healthy => {
  if (!healthy) {
    console.warn('警告：数据库连接异常，请检查配置');
  }
  
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
});
