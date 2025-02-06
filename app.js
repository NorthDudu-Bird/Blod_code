const express = require('express');
const app = express();
const connectDB = require('./config/db');

// 连接数据库
connectDB();

// 添加中间件来解析 JSON 请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供静态文件服务
app.use(express.static('public'));

// 使用路由
app.use('/api', require('./routes/posts'));

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 