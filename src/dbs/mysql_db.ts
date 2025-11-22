import { Product } from "../compiled_proto/app";
import { IDatabase } from "../interfaces";
import { Category, Order, User, UserPatchRequest } from "../types";
import mysql from "mysql2/promise";

export default class MySqlDB implements IDatabase {
  connection: mysql.Connection;

  async init() {
    this.connection = await mysql.createConnection({
      host: process.env.RDS_HOSTNAME,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      port: parseInt(process.env.RDS_PORT), // Convert port to a number
      database: process.env.RDS_DATABASE,
    });
    console.log("MySQL connected!");
  }

  constructor() {
    this.init();
  }

  async queryProductById(productId) {
    return (await this.connection.query(`SELECT *
                                FROM products
                                WHERE id = "${productId}";`))[0][0] as Product;
  };

  async queryRandomProduct() {
    return (await this.connection.query(`SELECT * FROM products ORDER BY RAND() LIMIT 1;`))[0][0] as Product;
  };

  queryAllProducts = async (category?: string) => {
    if (category) {
      return (await this.connection.query(`SELECT * FROM products WHERE categoryId = "${category}";`))[0] as Product[];
    }
    return (await this.connection.query(`SELECT * FROM products;`))[0] as Product[];
  };

  queryAllCategories = async () => {
    return (await this.connection.query("SELECT * FROM categories;"))[0] as Category[];
  };

  queryAllOrders = async () => {
    const query = `
      SELECT 
        o.id,
        o.userId,
        o.totalAmount,
        oi.productId,
        oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderId
      ORDER BY o.id
    `;
    
    const [rows] = await this.connection.query(query);
    const ordersMap = new Map<string, Order>();
    
    for (const row of rows as any[]) {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          userId: row.userId,
          totalAmount: row.totalAmount,
          products: []
        });
      }
      if (row.productId) {
        ordersMap.get(row.id)!.products.push({
          productId: row.productId,
          quantity: row.quantity
        });
      }
    }

    return Array.from(ordersMap.values());
  };

  async queryOrdersByUser(id: string) {
    const query = `
      SELECT 
        o.id,
        o.userId,
        o.totalAmount,
        oi.productId,
        oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderId
      WHERE o.userId = ?
      ORDER BY o.id
    `;
    
    const [rows] = await this.connection.query(query, [id]);
    const ordersMap = new Map<string, Order>();
    
    for (const row of rows as any[]) {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          userId: row.userId,
          totalAmount: row.totalAmount,
          products: []
        });
      }
      if (row.productId) {
        ordersMap.get(row.id)!.products.push({
          productId: row.productId,
          quantity: row.quantity
        });
      }
    }
    
    return Array.from(ordersMap.values());
  };

  queryOrderById = async (id: string) => {
    const query = `
      SELECT 
        o.id,
        o.userId,
        o.totalAmount,
        oi.productId,
        oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderId
      WHERE o.id = ?
    `;
    
    const [rows] = await this.connection.query(query, [id]);
    
    if (!rows || (rows as any[]).length === 0) {
      return null;
    }
    
    const firstRow = (rows as any[])[0];
    const order: Order = {
      id: firstRow.id,
      userId: firstRow.userId,
      totalAmount: firstRow.totalAmount,
      products: []
    };
    
    for (const row of rows as any[]) {
      if (row.productId) {
        order.products.push({
          productId: row.productId,
          quantity: row.quantity
        });
      }
    }
    
    return order;
  };

  queryUserById = async (id: string) => {
    return (
      await this.connection.query(`SELECT id, email, name
                             FROM users
                             WHERE id = "${id}";`)
    )[0][0];
  };

  queryAllUsers = async () => {
    return (await this.connection.query("SELECT id, name, email FROM users"))[0] as User[];
  };

  insertOrder = async (order: Order) => {
    await this.connection.query(
      `INSERT INTO orders (id, userId, totalAmount) VALUES (?, ?, ?)`,
      [order.id, order.userId, order.totalAmount]
    );
    
    if (order.products && order.products.length > 0) {
      for (let i = 0; i < order.products.length; i++) {
        const item = order.products[i];
        const orderItemId = `${order.id}_${i}`;
        await this.connection.query(
          `INSERT INTO order_items (id, orderId, productId, quantity) VALUES (?, ?, ?, ?)`,
          [orderItemId, order.id, item.productId, item.quantity]
        );
      }
    }
  };

  updateUser = async (patch: UserPatchRequest) => {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (patch.email !== undefined) {
      updates.push('email = ?');
      values.push(patch.email);
    }
    if (patch.password !== undefined) {
      updates.push('password = ?');
      values.push(patch.password);
    }
    
    if (updates.length > 0) {
      values.push(patch.id);
      await this.connection.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  };

  // This is to delete the inserted order to avoid database data being contaminated also to make the data in database consistent with that in the json files so the comparison will return true.
  // Feel free to modify this based on your inserOrder implementation
  deleteOrder = async (id: string) => {
    await this.connection.query(
      `DELETE FROM order_items WHERE orderId = ?`,
      [id]
    );
    await this.connection.query(
      `DELETE FROM orders WHERE id = ?`,
      [id]
    );
  };
};