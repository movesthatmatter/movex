import express from 'express';
import cors from 'cors';
import SocketHandler from './socket';

export const httpServer = () => {
  const app = express();

  app.use(cors());

  const greeting = { message: `Welcome to api!` };

  app.get('/api', (req, res) => {
    res.send(greeting);
  });

  // app.get('/', SocketHandler)

  return app;
};
