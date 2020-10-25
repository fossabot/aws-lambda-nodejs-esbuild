import * as childProcess from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { join } from 'ramda';

export class SpawnError extends Error {
  constructor(message: string, public stdout: string, public stderr: string) {
    super(message);
  }

  toString() {
    return `${this.message}\n${this.stderr}`;
  }
}

/**
 * Executes a child process without limitations on stdout and stderr.
 * On error (exit code is not 0), it rejects with a SpawnProcessError that contains the stdout and stderr streams,
 * on success it returns the streams in an object.
 * @param {string} command - Command
 * @param {string[]} [args] - Arguments
 * @param {Object} [options] - Options for child_process.spawn
 */
export function spawnProcess(command: string, args: string[], options: childProcess.SpawnOptionsWithoutStdio) {
  const child = childProcess.spawnSync(command, args, options);
  const stdout = child.stdout.toString('utf8');
  const stderr = child.stderr.toString('utf8');

  if (child.status !== 0) {
    throw new SpawnError(`${command} ${join(' ', args)} failed with code ${child.status}`, stdout, stderr);
  }

  return { stdout, stderr };
}

/**
 * Extracts the file name from handler string.
 */
export function extractFileName(cwd: string, handler: string): string {
  const fnName = path.extname(handler);
  const fnNameLastAppearanceIndex = handler.lastIndexOf(fnName);
  // replace only last instance to allow the same name for file and handler
  const fileName = handler.substring(0, fnNameLastAppearanceIndex);

  // Check if the .ts files exists. If so return that to watch
  if (fs.existsSync(path.join(cwd, fileName + '.ts'))) {
    return fileName + '.ts';
  }

  // Check if the .js files exists. If so return that to watch
  if (fs.existsSync(path.join(cwd, fileName + '.js'))) {
    return fileName + '.js';
  }

  // Can't find the files. Watch will have an exception anyway. So throw one with error.
  console.log(`Cannot locate handler - ${fileName} not found`);
  throw new Error('Compilation failed. Please ensure handler exists with ext .ts or .js');
}

/**
 * Find a file by walking up parent directories
 */
export function findUp(name: string, directory: string = process.cwd()): string | undefined {
  const absoluteDirectory = path.resolve(directory);

  if (fs.existsSync(path.join(directory, name))) {
    return directory;
  }

  const { root } = path.parse(absoluteDirectory);
  if (absoluteDirectory === root) {
    return undefined;
  }

  return findUp(name, path.dirname(absoluteDirectory));
}

/**
 * Forwards `rootDir` or finds project root folder.
 */
export function findProjectRoot(rootDir?: string): string | undefined {
  return rootDir
    ?? findUp(`.git${path.sep}`)
    ?? findUp('yarn.lock')
    ?? findUp('package-lock.json')
    ?? findUp('package.json');
}

/**
 * Returns the major version of node installation
 */
export function nodeMajorVersion(): number {
  return parseInt(process.versions.node.split('.')[0], 10);
}
