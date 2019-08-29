const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures')


describe.only('Folders Endpoints', function() {
    let db 

    before('make knex instance', () => {
        db = knex({
          client: 'pg',
          connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
      })
       after('disconnect from db', () => db.destroy())

       before('clean the table', () => db.raw('TRUNCATE folder RESTART IDENTITY CASCADE'))

       afterEach('cleanup', () => db.raw('TRUNCATE folder RESTART IDENTITY CASCADE'))

  describe(`GET /api/folders`, () => {
      context(`given no folders`, () => {
          it(`responds with 200 and an empty list`, () => {
              return supertest(app)
              .get(`/api/folders`)
              .expect(200, [])
          })
      })

      context(`given there are folders in the db`, () => {
          const testFolders = makeFoldersArray()
          beforeEach('insert folders', () => {
       
                return db 
                .into('folder')
                .insert(testFolders)
                })
            
          it(`responds w 200 and all of the folders`, () => {
              return supertest(app)
                .get('/api/folders')
                .expect(200) 
          })

      })
      context(`Given an XSS attack article`, () => {
        const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
beforeEach('insert malicious article', () => {
       return db
       .into('folder')
       .insert([ maliciousFolder ])
                })
it('removes XSS attack content', () => {
       return supertest(app)
        .get(`/api/folders`)
       .expect(200)
        .expect(res => {
       expect(res.body[0].folder_name).to.eql(expectedFolder.folder_name)
        })
    })
})

  })

  describe(`GET /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
        it(`responds with 404`, () => {
          const folderId = 123456
          return supertest(app)
            .get(`/api/folders/${folderId}`)
            .expect(404, { error: { message: `folder does not exist` } })
        })
      })
      context(`given there are folders in the db`, () => {
         
    const testFolders = makeFoldersArray()
      beforeEach('insert folders', () => {
            return db
              .into('folder')
              .insert(testFolders)
                 })

       
      it('responds w 200 and the specified folder', () => {
          const folderId = 2
          const expectedFolder = testFolders[folderId - 1]
          return supertest(app)
            .get(`/api/folders/${folderId}`)
            .expect(200, expectedFolder)
      })

    })
    context(`Given an XSS attack article`, () => {
    
        const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
  
        beforeEach('insert malicious folder', () => {
              return db
                .into('folder')
                .insert([ maliciousFolder ])
            })  
    
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/folders/${maliciousFolder.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.folder_name).to.eql(expectedFolder.folder_name)
            })
        })
      })
    })


    describe(`POST /api/folders`, () => {
        it(`creates a folder responding w 201 and the new folder`, function() {
            const newFolder = {
                folder_name: 'test new folder'
            }
            return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.folder_name).to.eql(newFolder.folder_name)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
                    
                })
                .then(res => 
                    supertest(app)
                        .get(`/api/folders/${res.body.id}`)
                        .expect(res.body)
                        )
        })
      
  
                it(`responds w 400 and an error message when the 'folder_name' is missing`, () => {
                    const requiredField = 'folder_name'
                    const newFolder = {
                        folder_name: 'test new folder'
                    }
                    delete newFolder[requiredField]

                    return supertest(app)
                        .post('/api/folders')
                        .send(newFolder)
                        .expect(400, {
                            error: { message: `required field missing` }
                        })
                })
                it('removes XSS attack content from response', () => {
                    const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
                    return supertest(app)
                      .post(`/api/folders`)
                      .send(maliciousFolder)
                      .expect(201)
                      .expect(res => {
                        expect(res.body.folder_name).to.eql(expectedFolder.folder_name)
                      })
                  })
                })
                
   
    describe(`DELETE /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
          it(`responds with 404`, () => {
            const folderId = 123456
            return supertest(app)
              .delete(`/api/folders/${folderId}`)
              .expect(404, { error: { message: `folder does not exist` } })
          })
        })
    
        context('Given there are folders in the database', () => {
      
          const testFolders = makeFoldersArray()
    
          beforeEach('insert folders', () => {
         
                    return db
              .into('folder')
              .insert(testFolders)
          })

                
            
    
          it('responds with 204 and removes the folder', () => {
            const idToRemove = 2
            const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove)
            return supertest(app)
              .delete(`/api/folders/${idToRemove}`)
              .expect(204)
              .then(res =>
                supertest(app)
                  .get(`/api/folders`)
                  .expect(expectedFolders)
              )
          })
        })
      })

      describe(`PATCH /api/folders/:folder_id`, () => {
          context(`given no folders`, () => {
              it(`responds w 400`, () => {
                  const folderId = 123456
                  return supertest(app)
                    .patch(`/api/folders/${folderId}`)
                    .expect(400, {
                        error: { message: `req body must contain 'folder name' `}
                    })
              })
          })
          context(`given there are folders in the db`, () => {
              const testFolders = makeFoldersArray()

              beforeEach('insert folders', () => {
                  return db
                    .into('folder')
                    .insert(testFolders)
              })

              it('responds w 204 and updates folder', () => {
                  const idToUpdate = 2
                  const updateFolder = {
                      folder_name: 'new folder name'
                  }
                  const expectedFolder = {
                      ...testFolders[idToUpdate - 1],
                      ...updateFolder
                  }
                  return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updateFolder)
                    .expect(204)
                    .then(res => 
                            supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder)
                            )
              })

              it(`responds w 400 when no required fields supplied`, () => {
                  const idToUpdate = 2
                  const updateFolder = {
                      folder_name: 'new folder name'
                  }
                  const expectedFolder = {
                      ...testFolders[idToUpdate -1],
                      ...updateFolder

                  }
                  return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send({
                        ...updateFolder,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder)
                    })
              })

          })
      })

    })


    

      


