import dotenv from 'dotenv';
dotenv.config();

// In-memory fallback database for development
class InMemoryDB {
  constructor() {
    this.collections = {
      users: [],
      tutors: [],
      chat_requests: [],
      chat_threads: [],
      chat_messages: [],
      tutor_profile_requests: [],
      subjects: null,
      tutor_reviews: [],
      subscriptions: [],
    };
  }

  collection(name) {
    return {
      find: (query) => {
        const collection = this.collections[name] || [];
        const matches = !query || Object.keys(query).length === 0
          ? collection
          : collection.filter(doc => Object.entries(query).every(([k, v]) => doc[k] === v));
        return {
          toArray: async () => matches,
        };
      },
      findOne: async (query) => {
        const collection = this.collections[name] || [];
        if (query._id) {
          return collection.find(doc => doc._id?.toString() === query._id.toString());
        }
        return collection.find(doc => Object.entries(query).every(([k, v]) => doc[k] === v));
      },
      insertOne: async (doc) => {
        const collection = this.collections[name] || [];
        this.collections[name] = [...collection, doc];
        return { insertedId: doc._id };
      },
      insertMany: async (docs) => {
        this.collections[name] = docs;
        return { insertedIds: docs.map(d => d._id) };
      },
      updateOne: async (query, update, options = {}) => {
        const collection = this.collections[name] || [];
        const index = collection.findIndex(doc => 
          Object.entries(query).every(([k, v]) => doc[k] === v)
        );
        if (index >= 0) {
          // Update existing document
          const updatedDoc = { ...collection[index], ...update.$set };
          const newCollection = [...collection];
          newCollection[index] = updatedDoc;
          this.collections[name] = newCollection;
          return { modifiedCount: 1 };
        } else if (options.upsert) {
          // Insert new document if upsert is true and document not found
          const newDoc = { ...query, ...update.$set };
          const newCollection = [...collection, newDoc];
          this.collections[name] = newCollection;
          return { modifiedCount: 0, upsertedId: query.id || query._id };
        }
        return { modifiedCount: 0 };
      },
      deleteMany: async () => {
        this.collections[name] = [];
        return {};
      },
      createIndex: async () => ({}),
    };
  }

  async admin() {
    return { ping: async () => ({ ok: 1 }) };
  }

  db(name) {
    return this;
  }

  async close() {
    console.log('✓ In-memory database closed');
  }
}

let client = null;
let db = null;
let isInMemory = false;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'tutors_db';

export async function connectDB() {
  try {
    if (client) {
      console.log('Database already connected');
      return db;
    }

    try {
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in the environment variables (.env file)');
      }

      const { MongoClient, ServerApiVersion } = await import('mongodb');
      
      client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        minPoolSize: 2,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });

      await client.connect();
      db = client.db(DB_NAME);

      // Verify connection
      await db.admin().ping();
      console.log('✓ MongoDB connected successfully');
      isInMemory = false;

      // Create collections if they don't exist
      await createCollections(db);

      return db;
    } catch (mongoError) {
      console.warn('⚠ MongoDB not available, using in-memory database');
      console.warn('  Error:', mongoError.message);
      
      // Fallback to in-memory database
      client = new InMemoryDB();
      db = client;
      isInMemory = true;
      
      console.log('✓ Using in-memory database (development mode)');
      console.log('ℹ Data will NOT persist between restarts');
      
      return db;
    }
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    throw error;
  }
}

async function createCollections(database) {
  if (isInMemory) return; // In-memory DB doesn't need collection creation
  
  try {
    const collections = [
      'users',
      'tutors',
      'chat_requests',
      'chat_threads',
      'chat_messages',
      'tutor_profile_requests',
      'subjects',
      'quizzes',
      'tutor_reviews',
      'subscriptions',
    ];

    for (const collection of collections) {
      try {
        await database.createCollection(collection);
        console.log(`✓ Created collection: ${collection}`);
      } catch (error) {
        if (error.code === 48) {
          console.log(`✓ Collection already exists: ${collection}`);
        } else {
          throw error;
        }
      }
    }

    // Create indexes for common queries
    await createIndexes(database);
  } catch (error) {
    console.error('Error creating collections:', error.message);
  }
}

async function createIndexes(database) {
  if (isInMemory) return; // In-memory DB doesn't need indexes
  
  try {
    // Drop old incorrect userId index if it exists
    try {
      await database.collection('tutors').dropIndex('userId_1');
      console.log('✓ Dropped old userId index');
    } catch (err) {
      // Index may not exist, that's fine
    }
    
    // Users indexes
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Tutors indexes - Use 'id' field, not 'userId'
    await database.collection('tutors').createIndex({ id: 1 }, { unique: true });
    
    // Chat requests indexes
    await database.collection('chat_requests').createIndex({ fromId: 1 });
    await database.collection('chat_requests').createIndex({ toId: 1 });
    
    // Chat threads indexes
    await database.collection('chat_threads').createIndex({ participantIds: 1 });
    
    // Chat messages indexes
    await database.collection('chat_messages').createIndex({ threadId: 1 });
    await database.collection('chat_messages').createIndex({ senderId: 1 });
    
    // Subscriptions indexes
    await database.collection('subscriptions').createIndex({ tutorId: 1 }, { unique: true });
    
    // Tutor reviews indexes
    await database.collection('tutor_reviews').createIndex({ tutorId: 1 });
    
    console.log('✓ Database indexes created successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Indexes already exist');
    }
  }
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let inMemoryFallbackInstance = null;
let useInMemoryFallback = false;

async function populateInMemoryFromJSON(inMemoryDB) {
  try {
    const jsonDir = path.join(__dirname, '..', 'data', 'json');
    if (!fs.existsSync(jsonDir)) return;
    const files = fs.readdirSync(jsonDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const collectionName = path.basename(f, '.json');
        try {
          const content = fs.readFileSync(path.join(jsonDir, f), 'utf-8');
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            inMemoryDB.collections[collectionName] = data;
          } else if (collectionName === 'subjects') {
            inMemoryDB.collections.subjects = data;
          } else if (collectionName === 'quizzes') {
            inMemoryDB.collections.quizzes = data;
          }
        } catch (_) {}
      }
    }
    console.log('✓ In-memory DB populated with fallback local data');
  } catch (err) {
    console.warn('Failed to populate in-memory fallback:', err.message);
  }
}

export async function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }

  if (isInMemory || useInMemoryFallback) {
    if (!inMemoryFallbackInstance) {
      inMemoryFallbackInstance = new InMemoryDB();
      await populateInMemoryFromJSON(inMemoryFallbackInstance);
    }
    return inMemoryFallbackInstance;
  }

  return new Proxy(db, {
    get(target, prop) {
      if (useInMemoryFallback) {
        if (!inMemoryFallbackInstance) {
          inMemoryFallbackInstance = new InMemoryDB();
          populateInMemoryFromJSON(inMemoryFallbackInstance).catch(() => {});
        }
        return Reflect.get(inMemoryFallbackInstance, prop, inMemoryFallbackInstance);
      }

      if (prop === 'collection') {
        return function(collectionName) {
          const realCollection = target.collection(collectionName);
          if (!inMemoryFallbackInstance) {
            inMemoryFallbackInstance = new InMemoryDB();
            populateInMemoryFromJSON(inMemoryFallbackInstance).catch(() => {});
          }
          const inMemoryCollection = inMemoryFallbackInstance.collection(collectionName);

          return new Proxy(realCollection, {
            get(cTarget, cProp) {
              if (useInMemoryFallback) {
                return Reflect.get(inMemoryCollection, cProp, inMemoryCollection);
              }

              const val = Reflect.get(cTarget, cProp);
              if (typeof val === 'function') {
                if (cProp === 'find') {
                  return function(...args) {
                    if (useInMemoryFallback) {
                      return inMemoryCollection.find(...args);
                    }
                    try {
                      const cursor = val.apply(cTarget, args);
                      return new Proxy(cursor, {
                        get(cursorTarget, cursorProp) {
                          if (useInMemoryFallback) {
                            const fbCursor = inMemoryCollection.find(...args);
                            return Reflect.get(fbCursor, cursorProp);
                          }
                          const cursorVal = Reflect.get(cursorTarget, cursorProp);
                          if (typeof cursorVal === 'function') {
                            return async function(...cursorArgs) {
                              if (useInMemoryFallback) {
                                const fbCursor = inMemoryCollection.find(...args);
                                const fbCursorFunc = Reflect.get(fbCursor, cursorProp);
                                return typeof fbCursorFunc === 'function' ? fbCursorFunc.apply(fbCursor, cursorArgs) : fbCursorFunc;
                              }
                              try {
                                return await cursorVal.apply(cursorTarget, cursorArgs);
                              } catch (err) {
                                console.error(`[ResilientDB Cursor Error in find.${cursorProp}]:`, err.message);
                                useInMemoryFallback = true;
                                const fbCursor = inMemoryCollection.find(...args);
                                const fbCursorFunc = Reflect.get(fbCursor, cursorProp);
                                return typeof fbCursorFunc === 'function' ? fbCursorFunc.apply(fbCursor, cursorArgs) : fbCursorFunc;
                              }
                            };
                          }
                          return cursorVal;
                        }
                      });
                    } catch (err) {
                      console.error(`[ResilientDB Error in find]:`, err.message);
                      useInMemoryFallback = true;
                      return inMemoryCollection.find(...args);
                    }
                  };
                }

                return async function(...args) {
                  if (useInMemoryFallback) {
                    const fallbackFunc = Reflect.get(inMemoryCollection, cProp);
                    return typeof fallbackFunc === 'function' ? fallbackFunc.apply(inMemoryCollection, args) : fallbackFunc;
                  }
                  try {
                    return await val.apply(cTarget, args);
                  } catch (err) {
                    console.error(`[ResilientDB Error in ${collectionName}.${cProp}]:`, err.message);
                    useInMemoryFallback = true;
                    console.warn('⚠ Mongo timed out or errored. Switching to In-Memory DB!');
                    const fbFunc = Reflect.get(inMemoryCollection, cProp);
                    if (typeof fbFunc === 'function') {
                      return fbFunc.apply(inMemoryCollection, args);
                    }
                    return fbFunc;
                  }
                };
              }
              return val;
            }
          });
        };
      }
      return Reflect.get(target, prop);
    }
  });
}

export async function disconnectDB() {
  if (client) {
    if (client.close) {
      await client.close();
    }
    client = null;
    db = null;
    console.log('Database disconnected');
  }
}

