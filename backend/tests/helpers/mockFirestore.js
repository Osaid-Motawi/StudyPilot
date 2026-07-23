'use strict';

/**
 * A minimal in-memory Firestore stand-in supporting exactly the chains used by
 * the services:
 *   db.collection('users').doc(uid).collection('quizzes').doc([id]).set()/get()
 *   db.collection('users').doc(uid).collection('quizzes').get()  -> { docs }
 * Business logic runs against this without any live Firestore (Principle IV).
 */
function makeMockDb() {
  const collections = new Map(); // fullPath -> Map(docId -> data)
  let idSeq = 0;

  function coll(path) {
    if (!collections.has(path)) collections.set(path, new Map());
    return collections.get(path);
  }

  function collectionRef(path) {
    return {
      doc(id) {
        const docId = id != null ? id : `auto_${++idSeq}`;
        return docRef(path, docId);
      },
      async get() {
        const map = coll(path);
        const docs = [...map.entries()].map(([id, data]) => ({
          id,
          exists: true,
          data: () => data,
        }));
        return { docs, size: docs.length, forEach: (fn) => docs.forEach(fn) };
      },
    };
  }

  function docRef(collPath, id) {
    return {
      id,
      async set(value) {
        coll(collPath).set(id, value);
      },
      async get() {
        const map = coll(collPath);
        const exists = map.has(id);
        return { exists, id, data: () => (exists ? map.get(id) : undefined) };
      },
      collection(sub) {
        return collectionRef(`${collPath}/${id}/${sub}`);
      },
    };
  }

  return {
    collection: (name) => collectionRef(name),
    __dump: () => collections,
  };
}

module.exports = { makeMockDb };
