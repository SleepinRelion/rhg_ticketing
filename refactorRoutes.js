import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;

const ROUTES_DIR = path.resolve('server/routes');

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let ast;
  
  try {
    ast = parse(code, { sourceType: 'module' });
  } catch (err) {
    console.error(`Failed to parse ${filePath}:`, err);
    return;
  }

  let needsAsyncHandlerImport = false;
  let hasAsyncHandlerImport = false;
  let modified = false;

  // 1. Check if asyncHandler is already imported
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === '../utils/asyncHandler.js') {
        hasAsyncHandlerImport = true;
      }
    }
  });

  // 2. Transform the routes
  traverse(ast, {
    CallExpression(path) {
      const { callee, arguments: args } = path.node;
      
      // Look for router.get, router.post, etc.
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: 'router' })
      ) {
        // The last argument should be the route handler
        const lastArgIndex = args.length - 1;
        const lastArg = args[lastArgIndex];

        if (t.isFunctionExpression(lastArg) || t.isArrowFunctionExpression(lastArg)) {
          const body = lastArg.body;
          
          // Check if body is a block containing only a TryStatement or starts with TryStatement
          if (t.isBlockStatement(body)) {
            // Check if there is a try-catch block wrapping the entire logic
            const tryIndex = body.body.findIndex(stmt => t.isTryStatement(stmt));
            
            if (tryIndex !== -1) {
              const tryStmt = body.body[tryIndex];
              
              // We replace the try statement with its inner block
              body.body.splice(tryIndex, 1, ...tryStmt.block.body);
              
              // Now wrap the function in asyncHandler
              const asyncHandlerCall = t.callExpression(t.identifier('asyncHandler'), [lastArg]);
              path.node.arguments[lastArgIndex] = asyncHandlerCall;
              
              needsAsyncHandlerImport = true;
              modified = true;
              path.skip(); // Skip traversing children of this modified node
            }
          }
        }
      }
    }
  });

  if (modified) {
    // 3. Inject the import at the top
    if (needsAsyncHandlerImport && !hasAsyncHandlerImport) {
      const importDecl = t.importDeclaration(
        [t.importSpecifier(t.identifier('asyncHandler'), t.identifier('asyncHandler'))],
        t.stringLiteral('../utils/asyncHandler.js')
      );
      ast.program.body.unshift(importDecl);
    }

    const output = generate(ast, {}, code);
    fs.writeFileSync(filePath, output.code);
    console.log(`Refactored: ${filePath}`);
  }
}

// Traverse the server/routes directory
function run() {
  const files = fs.readdirSync(ROUTES_DIR);
  for (const file of files) {
    if (file.endsWith('.js')) {
      processFile(path.join(ROUTES_DIR, file));
    } else {
       const stat = fs.statSync(path.join(ROUTES_DIR, file));
       if (stat.isDirectory()) {
           const subFiles = fs.readdirSync(path.join(ROUTES_DIR, file));
           for (const subFile of subFiles) {
               if (subFile.endsWith('.js')) {
                   processFile(path.join(ROUTES_DIR, file, subFile));
               }
           }
       }
    }
  }
}

run();
