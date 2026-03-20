import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  return "redis://localhost:6379";
};

const redis = new Redis(getRedisUrl());

export default redis;
