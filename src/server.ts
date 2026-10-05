import { createServer } from "node:http";
import { createApp } from "./graphql.js";

const port = 4000;
const yoga = createApp();

createServer(yoga).listen(port, () => {
  console.log(`http://localhost:${port}/graphql`);
});
