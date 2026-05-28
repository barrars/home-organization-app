// Ambient script — no imports/exports so TypeScript treats this as a global ambient declaration.
// ts-node-dev --files loads all tsconfig-included .d.ts files before compiling any file.
declare namespace Express {
  interface Request {
    homeId: import('mongoose').Types.ObjectId
    home: import('../models/home.model').IHome
  }
}
