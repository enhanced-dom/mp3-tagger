#!/usr/bin/env node
/* global process */
import fse from 'fs-extra'
import * as path from 'path'
import NodeID3 from 'node-id3'
import yargs from 'yargs'
import { execSync } from 'child_process'

// ponytail: kept in sync with package.json "engines.node" by hand, no build-time templating
const MIN_NODE_VERSION = '22.23.2'

const isVersionAtLeast = (current: string, min: string) => {
  const c = current.split('.').map(Number)
  const m = min.split('.').map(Number)
  for (let i = 0; i < m.length; i++) {
    if ((c[i] ?? 0) !== (m[i] ?? 0)) {
      return (c[i] ?? 0) > (m[i] ?? 0)
    }
  }
  return true
}

if (!isVersionAtLeast(process.versions.node, MIN_NODE_VERSION)) {
  console.error(`Error: Node.js version is insufficient (needs minimum v${MIN_NODE_VERSION})`)
  process.exit(1)
}

let errorFileDescriptor: number | undefined = undefined
const logInFolder = (logType: 'skip' | 'error', filePath: string) => {
  if (errorFileDescriptor === undefined) {
    const folderPath = path.dirname(filePath)
    errorFileDescriptor = fse.openSync(path.join(folderPath, `mp3-process-${new Date().toISOString()}`), 'w')
  }
  fse.writeFileSync(errorFileDescriptor, `${logType.toUpperCase()} ${path.basename(filePath)}\n`)
}

function processFile(filePath: string) {
  const folderPath = path.dirname(filePath)
  let fileNameToProcess = path.basename(filePath)
  let inputFilePath = filePath
  if (path.extname(inputFilePath).toLowerCase() === '.m4a') {
    console.log(`Converting to mp3 ${inputFilePath}`)
    const outputFileName = fileNameToProcess.replace(path.extname(fileNameToProcess), '.mp3')
    const outputFilePath = path.join(folderPath, outputFileName)
    try {
      execSync(`ffmpeg -i "${inputFilePath}" -c:v copy -c:a libmp3lame -q:a 4 "${outputFilePath}"`, { stdio: 'ignore' })
      fse.unlinkSync(inputFilePath)
      fileNameToProcess = outputFileName
      inputFilePath = outputFilePath
    } catch {
      logInFolder('error', inputFilePath)
      return
    }
  }

  if (path.extname(inputFilePath).toLowerCase() === '.mp3') {
    console.log(`Processing tags for ${inputFilePath}`)
    // Rename files with underscores
    if (fileNameToProcess.includes('_')) {
      const newFileName = fileNameToProcess.replace(/_/g, ' ')
      const newFilePath = path.join(folderPath, newFileName)
      fse.renameSync(inputFilePath, newFilePath)
      fileNameToProcess = newFileName
      inputFilePath = newFilePath
    }

    // Split filename to get artist and title
    let [artist, title] = fileNameToProcess.split(/ - /)
    if (!title) {
      ;[artist, title] = fileNameToProcess.split('-')
      if (!title) {
        logInFolder('skip', inputFilePath)
        return
      }
    }
    if (!artist) {
      logInFolder('skip', inputFilePath)
      return
    }

    // Remove extension from title
    title = title.substring(0, title.lastIndexOf('.'))

    // Update ID3 tags
    const tags = {
      title: title.trim(),
      artist: artist.trim(),
      image: undefined, // Clear existing images
    }

    NodeID3.write(tags, inputFilePath, (err) => {
      if (err) {
        logInFolder('error', inputFilePath)
      } else {
        console.log(`Tags updated for ${inputFilePath}`)
      }
    })
  }
}

function processFiles(fileOrFolderPath: string) {
  try {
    const pathExists = fse.existsSync(fileOrFolderPath)
    if (!pathExists) {
      console.error(`Path not found ${fileOrFolderPath}`)
      process.exit(1)
    }
    const isFile = fse.statSync(fileOrFolderPath).isFile()

    if (isFile) {
      processFile(fileOrFolderPath)
      return
    }

    const filePaths = fse
      .readdirSync(fileOrFolderPath)
      .filter((file) => ['.mp3', '.m4a'].includes(path.extname(file).toLowerCase()))
      .map((fileName) => path.join(fileOrFolderPath, fileName))

    if (!filePaths.length) {
      console.log(`No files to process at path ${fileOrFolderPath}`)
      process.exit(0)
    }

    for (let filePath of filePaths) {
      processFile(filePath)
    }
  } catch (error) {
    console.error('Error processing files:', error)
    process.exit(1)
  }
}

yargs(process.argv.slice(2))
  .command(
    '* <fileOrFolderPath>',
    'default command',
    (y) =>
      y.positional('fileOrFolderPath', {
        describe: 'path to the folder or file',
        type: 'string',
        demandOption: true,
      }),
    (args) => processFiles(args.fileOrFolderPath),
  )
  .parse()

