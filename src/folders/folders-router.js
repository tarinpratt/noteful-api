const path = require('path')
const express = require('express')
const FoldersService  = require('./folders-service')
const xss = require('xss')
const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = folder => ({
  id: folder.id,
  folder_name: xss(folder.folder_name)
})

foldersRouter   
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FoldersService.getAllFolders(knexInstance)
        .then(folders => {
            res.json(folders.map(serializeFolder))
        })
        .catch(next)
    })

    .post(jsonParser, (req, res, next) => {
        const { folder_name } = req.body

        const newFolder = { folder_name }

        if (folder_name === undefined) {
          return res.status(400).json({
            error: { message: `required field missing` }
          })
        } else {
       FoldersService.insertFolder(
          req.app.get('db'),
          newFolder
        )
          .then(folder => {
            res
              .status(201)
              .location(path.posix.join(req.originalUrl, `/${folder.id}`))
              .json(serializeFolder(folder))
          })
        
        
          .catch(next)
        }
      })



foldersRouter
  .route('/:folder_id')
  .get((req, res, next) => {
    FoldersService.getById(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `folder does not exist` }
          })
        }
        res.json(serializeFolder(folder))
      })
      .catch(next)
  })
  .delete((req, res, next) => {
    FoldersService.deleteFolder(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(numRowsAffected => {
        if(numRowsAffected > 0) {
          res.status(204).end()
        } else {
          res.status(404).json({error: { message: `folder does not exist` } })
        }
        
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
      const { folder_name } = req.body
      const folderToUpdate = { folder_name }
      const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
      if (numberOfValues === 0) {
          return res.status(400).json({
              error: { message: `req body must contain 'folder name' `}

          })
      }

      FoldersService.updateFolder(
            req.app.get('db'),
            req.params.folder_id,
            folderToUpdate
      )
      .then(numRowsAffected => {
          res.status(204).end()
      })
      .catch(next)
  })



module.exports = foldersRouter