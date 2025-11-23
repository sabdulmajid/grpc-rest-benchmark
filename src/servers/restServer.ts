import { IDatabase, IServer } from "../interfaces";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import logger from '../logger';
import bodyParser from "body-parser";
import { AllProductsRequest, Order, OrderRequest, ProductRequest, UserPatchRequest, UserRequest } from "../types";

export default class RestServer implements IServer {

  db: IDatabase;
  server: any;

  private requestCount: number = 0;

  constructor(db: IDatabase) {
    this.db = db;
    this.server = express();
  }

  start() {
    const port = 3000;
    this.server.use(cors());
    this.server.use(morgan("tiny"));
    this.server.use(bodyParser.json());

    // middleware to log incoming requests and increment request count
    this.server.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.requestCount++;
      logger.info({
        message: `Incoming request: ${req.method} ${req.originalUrl}`,
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        body: req.body,
        totalRequests: this.requestCount
      });
      next();
    });

    this.server.get("/", (req: express.Request, res: express.Response) => res.send("Hello, World!"));

    this.server.get("/product/:productId", async (req: express.Request, res: express.Response) => {
      const { productId } = (req.params as ProductRequest);
      if (!productId) {
        res.status(400).send("No product id provided");
        return;
      }
      const product = await this.db.queryProductById(productId);
      res.send(product);
    }); // Gets a product by product id

    this.server.get("/randomproduct", async (req: express.Request, res: express.Response) => {
      const randProd = await this.db.queryRandomProduct();
      res.send(randProd);
    }); // I'm feeling lucky type

    this.server.get("/products", async (req: express.Request, res: express.Response) => {
      const { categoryId } = (req.query as AllProductsRequest);
      const products = await this.db.queryAllProducts(categoryId);
      res.send(products);
    }); // Gets all products, or by category

    this.server.get("/categories", async (req: express.Request, res: express.Response) => {
      const categories = await this.db.queryAllCategories();
      res.send(categories);
    }); // Gets all categories

    this.server.get("/allorders", async (req: express.Request, res: express.Response) => {
      const orders = await this.db.queryAllOrders();
      res.send(orders);
    }); // Gets all orders

    this.server.get("/orders", async (req: express.Request, res: express.Response) => {
      const { id } = (req.query as UserRequest);
      if (!id) {
        res.status(400).send("No user id provided");
        return;
      }
      const orders = await this.db.queryOrdersByUser(id);
      res.send(orders);
    }); // Gets all of a single user's orders

    this.server.get("/order/:id", async (req: express.Request, res: express.Response) => {
      const { id } = (req.params as OrderRequest);
      if (!id) {
        res.status(400).send("No order id provided");
        return;
      }
      const order = await this.db.queryOrderById(id);
      res.send(order);
    }); // Gets more details on a specific order by id

    this.server.get("/user/:id", async (req: express.Request, res: express.Response) => {
      const { id } = (req.params as UserRequest);
      if (!id) {
        res.status(400).send("No user id provided");
        return;
      }
      const user = await this.db.queryUserById(id);
      res.send(user);
    }); // Gets details on a specific user by username

    this.server.get("/users", async (_req: express.Request, res: express.Response) => {
      const users = await this.db.queryAllUsers();
      res.send(users);
    });// Gets all users

    this.server.post("/orders", async (req: express.Request, res: express.Response) => {
      const order = (req.body as Order);
      await this.db.insertOrder(order);
      res.status(201).send();
    }); // Creates a new order

    this.server.patch("/user/:id", async (req: express.Request, res: express.Response) => {
      const updates = req.body;
      const userId = (req.params as UserRequest).id;
      const patch: UserPatchRequest = {
        ...updates,
        id: userId,
      }
      await this.db.updateUser(patch);
      res.status(200).send();
    }); // Updates a user's email or password

    this.server.delete("/order/:id", async (req: express.Request, res: express.Response) => {
      const { id } = req.params as OrderRequest;
      if (!id) {
        res.status(400).send("No order id provided");
        return;
      }
      try {
        await this.db.deleteOrder(id);
        res.status(204).send(); // No Content
      } catch (error) {
        logger.info({
          message: `Error deleting order with id ${id}`,
          error,
          orderId: id,
          totalRequests: this.requestCount
        });
        res.status(500).send({ error: 'Failed to delete order' });
      }
    }); // Deletes an order by id

    this.server.listen(port, () => {
      logger.info(`REST server listening on port ${port}`);
    });
  }
}
