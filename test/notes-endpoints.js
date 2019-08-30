const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeFoldersArray } = require('./folders.fixtures')
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures')


describe.only('Notes Endpoints', function() {
    let db 

    before('make knex instance', () => {
        db = knex({
          client: 'pg',
          connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
      })
      after('disconnect from db', () => db.destroy())

      before('clean the table', () => db.raw('TRUNCATE note, folder RESTART IDENTITY CASCADE'))

      afterEach('cleanup', () => db.raw('TRUNCATE note, folder RESTART IDENTITY CASCADE'))

  describe.only(`GET /api/notes`, () => {
      context(`given no notes`, () => {
          it(`responds with 200 and an empty list`, () => {
              return supertest(app)
              .get(`/api/notes`)
              .expect(200, [])
          })
      })

  

      context(`given there are notes in the db`, () => {
          const testFolders = makeFoldersArray()
          const testNotes = makeNotesArray()
          beforeEach('insert notes', () => {
                return db 
                .into('folder')
                .insert(testFolders)
                .then(() => {
                    return db 
                    .into('note')
                    .insert(testNotes)
                })
            })
            
          it(`responds w 200 and all of the notes`, () => {
              return supertest(app)
                .get('/api/notes')
                .expect(200)
          })

      })
      context(`Given an XSS attack note`, () => {
        const testFolders = makeFoldersArray();
        const { maliciousNote, expectedNote} = makeMaliciousNote()
  
        beforeEach('insert malicious note', () => {
          return db
            .into('folder')
            .insert(testFolders)
            .then(() => {
              return db
                .into('note')
                .insert([ maliciousNote ])
           
            }) 
        })
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/notes`)
            .expect(200)
            .expect(res => {
              expect(res.body[0].note_name).to.eql(expectedNote.note_name)
              expect(res.body[0].note_content).to.eql(expectedNote.note_content)
            })
        })
      })
    })
  

 

  describe.only(`GET /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
        it(`responds with 404`, () => {
          const noteId = 123456
          return supertest(app)
            .get(`/api/notes/${noteId}`)
            .expect(404, { error: { message: `note does not exist` } })
        })
      })
      context(`given there are notes in the db`, () => {
         
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()
        beforeEach('insert notes', () => {
              return db 
              .into('folder')
              .insert(testFolders)
              .then(() => {
                  return db 
                  .into('note')
                  .insert(testNotes)
              })
          })

       
          

      it('responds w 200 and the specified note', () => {
          const noteId = 2
          const expectedNote = testNotes[noteId - 1]
          return supertest(app)
            .get(`/api/notes/${noteId}`)
            .expect(200, expectedNote)
      })

    })
    context(`Given an XSS attack note`, () => {
        const testFolders = makeFoldersArray();
        const { maliciousNote, expectedNote } = makeMaliciousNote()
  
        beforeEach('insert malicious note', () => {
          return db
            .into('folder')
            .insert(testFolders)
            .then(() => {
              return db
                .into('note')
                .insert([ maliciousNote ])
            })  
        })
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/notes/${maliciousNote.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.note_name).to.eql(expectedNote.note_name)
              expect(res.body.note_content).to.eql(expectedNote.note_content)
            })
        })
      })
    })

    describe.only(`POST /api/notes`, () => {
        const testFolders = makeFoldersArray();
    beforeEach('insert notes', () => {
      return db
        .into('folder')
        .insert(testFolders) 
        
    })
        it(`creates a note responding w 201 and the new note`, function() {
            const newNote = {
                note_name: 'test new note',
                note_content: 'test new note content',
                folder_id: 2,
            }
            return supertest(app)
                .post('/api/notes')
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.note_name).to.eql(newNote.note_name)
                    expect(res.body.note_content).to.eql(newNote.note_content)
                    expect(res.body.folder_id).to.eql(newNote.folder_id)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
                    
                    
                })
                .then(res => 
                    supertest(app)
                        .get(`/api/notes/${res.body.id}`)
                        .expect(res.body)
                        )
        })
        const requiredFields = ['note_name', 'note_content', 'folder_id']
            requiredFields.forEach(field => {
                const newNote = {
                    note_name: 'test new note name',
                    note_content: 'test new note content',
                    folder_id: 1,
                }
                it(`responds w 400 and an error message when the ${field} is missing`, () => {
                    delete newNote[field]

                    return supertest(app)
                        .post('/api/notes')
                        .send(newNote)
                        .expect(400, {
                            error: {message: `required field missing`}
                        })
                })
            })
            it('removes XSS attack content from response', () => {
                const { maliciousNote, expectedNote } = makeMaliciousNote()
                return supertest(app)
                  .post(`/api/notes`)
                  .send(maliciousNote)
                  .expect(201)
                  .expect(res => {
                    expect(res.body.note_name).to.eql(expectedNote.note_name)
                    expect(res.body.note_content).to.eql(expectedNote.note_content)
                  })
              })
            })
    describe.only(`DELETE /api/notes/:note_id`, () => {
        context(`Given no notes`, () => {
          it(`responds with 404`, () => {
            const noteId = 123456
            return supertest(app)
              .delete(`/api/notes/${noteId}`)
              .expect(404, { error: { message: `note does not exist` } })
          })
        })
    
        context('Given there are notes in the database', () => {
            const testFolders = makeFoldersArray()
            const testNotes = makeNotesArray()
            beforeEach('insert notes', () => {
                  return db 
                  .into('folder')
                  .insert(testFolders)
                  .then(() => {
                      return db 
                      .into('note')
                      .insert(testNotes)
                  })
              })
                
            
    
          it('responds with 204 and removes the note', () => {
            const idToRemove = 2
            const expectedNotes = testNotes.filter(note => note.id !== idToRemove)
            return supertest(app)
              .delete(`/api/notes/${idToRemove}`)
              .expect(204)
              .then(res =>
                supertest(app)
                  .get(`/api/notes`)
                  .expect(expectedNotes)
              )
          })
        })
      })

      describe.only(`PATCH /api/notes/:note_id`, () => {
          context(`given no notes`, () => {
              it(`responds w 400`, () => {
                  const noteId = 123456
                  return supertest(app)
                    .patch(`/api/notes/${noteId}`)
                    .expect(400, {
                        error: { message: `req body must contain 'note_content', 'note_name' and 'folder_id' `}
                    })
              })
          })
          context(`given there are notes in the db`, () => {
            const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()
        beforeEach('insert notes', () => {
              return db 
              .into('folder')
              .insert(testFolders)
              .then(() => {
                  return db 
                  .into('note')
                  .insert(testNotes)
              })
          })

              it('responds w 204 and updates note', () => {
                  const idToUpdate = 2
                  const updateNote = {
                      note_name: 'new note name',
                      note_content: 'new note content',
                      folder_id: 1
                  }
                  const expectedNote = {
                      ...testNotes[idToUpdate - 1],
                      ...updateNote
                  }
                  return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updateNote)
                    .expect(204)
                    .then(res => 
                            supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)
                            )
              })

              it(`responds w 400 when no required fields supplied`, () => {
                  const idToUpdate = 2
                  const updateNote = {
                      note_name: 'new note name',
                      note_content: 'new note content',
                      folder_id: 1
                  }
                  const expectedNote = {
                      ...testNotes[idToUpdate -1],
                      ...updateNote

                  }
                  return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({
                        ...updateNote,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)
                    })
              })

          })
      })

    })

