export type D1Like = {
  prepare: (sql: string) => {
    bind: (...params: any[]) => {
      first: <T = any>() => Promise<T | null>;
      all: <T = any>() => Promise<{ results: T[] }>;
      run: () => Promise<void>;
    };
  };
};

/**
 * D1 の REST クライアント（exec など）や、Workers の D1Database のどちらでも
 * 同じインターフェイスで呼べるようにする薄いアダプタ。
 */
export function toD1Like(db: any): D1Like {
  const hasPrepare = typeof db?.prepare === "function";
  const hasExec = typeof db?.exec === "function";

  return {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first<T = any>() {
              if (hasPrepare) {
                // Workers/Bun 環境の D1Database 互換
                // @ts-ignore
                return await db.prepare(sql).bind(...params).first<T>();
              }
              if (hasExec) {
                // REST クライアントを想定
                const res = await db.exec(sql, params);
                // exec の戻り値想定: { results?: any[] }
                const row = res?.results?.[0] ?? null;
                return row as T | null;
              }
              throw new Error("No suitable D1 client method found (prepare/exec).");
            },
            async all<T = any>() {
              if (hasPrepare) {
                // @ts-ignore
                const r = await db.prepare(sql).bind(...params).all<T>();
                return { results: r?.results ?? [] };
              }
              if (hasExec) {
                const res = await db.exec(sql, params);
                return { results: res?.results ?? [] };
              }
              throw new Error("No suitable D1 client method found (prepare/exec).");
            },
            async run() {
              if (hasPrepare) {
                // @ts-ignore
                await db.prepare(sql).bind(...params).run();
                return;
              }
              if (hasExec) {
                await db.exec(sql, params);
                return;
              }
              throw new Error("No suitable D1 client method found (prepare/exec).");
            },
          };
        },
      };
    },
  };
}