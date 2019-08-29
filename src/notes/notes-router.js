const path = require('path')
const express = require('express')
const NotesService  = require('./notes-server')
const xss = require('xss')
const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
  id: note.id,
  note_name: xss(note.note_name),
  note_content: xss(note.note_content),
  date_modified: note.date_modified,
  folder_id: (note.folder_id)

})


notesRouter   
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
        .then(notes => {
            res.json(notes.map(serializeNote))
        })
        .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { note_name, note_content, folder_id } = req.body
        const newNote = { note_name, note_content, folder_id }
        console.log('new note', newNote)
        //for (const [key, value] of Object.entries(newNote))
        if (note_name === undefined || note_content === undefined || folder_id === undefined) {
          return res.status(400).json({
            error: { message: `required field missing` }
          })
        } else {
       NotesService.insertNote(
          req.app.get('db'),
          newNote
        )
          .then(note => {
            res
              .status(201)
              .location(path.posix.join(req.originalUrl, `/${note.id}`))
              .json(serializeNote(note))
          })
        
        
          .catch(next)
        }
      })
    

notesRouter
  .route('/:note_id')
  .get((req, res, next) => {
    NotesService.getById(
      req.app.get('db'),
      req.params.note_id
    )
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `note does not exist` }
          })
        }
        res.json(serializeNote(note))
      })
      .catch(next)
  })
  .delete((req, res, next) => {

    NotesService.deleteNote(
      req.app.get('db'),
      req.params.note_id
    )
      .then(numRowsAffected => {
   
        if(numRowsAffected > 0) {
          res.status(204).end()
        } else {
          res.status(404).json({error: { message: `note does not exist` } })
        }
        
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
    const { note_name, note_content, folder_id } = req.body
    const noteToUpdate = { note_name , note_content, folder_id }
    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
        return res.status(400).json({
            error: { message: `req body must contain 'note_content', 'note_name' and 'folder_id' `}

        })
    }

    NotesService.updateNote(
          req.app.get('db'),
          req.params.note_id,
          noteToUpdate
    )
    .then(numRowsAffected => {
        res.status(204).end()
    })
    .catch(next)
})




module.exports = notesRouter