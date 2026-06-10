declare module 'better-sqlite3' {
  namespace Database {
    interface Database {
      prepare(source: string): Statement;
      exec(source: string): this;
      pragma(source: string, options?: any): any;
      close(): this;
    }
    interface Statement {
      run(...bindParameters: any[]): { changes: number; lastInsertRowid: number | bigint };
      get(...bindParameters: any[]): any;
      all(...bindParameters: any[]): any[];
    }
  }
  interface DatabaseConstructor {
    new(filename: string, options?: any): Database.Database;
    (filename: string, options?: any): Database.Database;
    Database: DatabaseConstructor;
  }
  const Database: DatabaseConstructor;
  export = Database;
}
