#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

const main = async () => {
    await execCommands();
    createFiles();

    updateMainTs();

    updateAngular();

    updateTsConfigApp();
}

const execCommands = () => {
    return execCommandPromise('npm i --save-dev @angularclass/hmr');
};

const execCommandPromise = (command) => {
    return new Promise((res, rej) => {
        const prefix = [
            '\\', '|', '/', '-'
        ];

        let currentPrefixIndex = prefix.length;

        const interval = setInterval(() => {
            currentPrefixIndex = ++currentPrefixIndex >= prefix.length ? 0 : currentPrefixIndex;
            process.stdout.write(`${prefix[currentPrefixIndex]} Executing ${command}`);
            process.stdout.write('\r');
        }, 200)

        const child = exec(command, (err, stdout, stderr) => {
            clearInterval(interval);
            if (err) {
                process.stderr.write(`\nexec error: ${err}`);
                rej(err);
            }
            process.stderr.write(`\n${stderr}`);
            res();
        });

        child.stdout.pipe(process.stdout);
    });
}

const createFiles = () => {
    try {
        fs.writeFileSync('src/hmr.ts', `import { NgModuleRef, ApplicationRef } from '@angular/core';
import { createNewHosts } from '@angularclass/hmr';

export const hmrBootstrap = (
  module: any,
  bootstrap: () => Promise<NgModuleRef<any>>
) => {
  let ngModule: NgModuleRef<any>;
  module.hot.accept();
  bootstrap().then(mod => (ngModule = mod));
  module.hot.dispose(() => {
    const appRef: ApplicationRef = ngModule.injector.get(ApplicationRef);
    const elements = appRef.components.map(c => c.location.nativeElement);
    const makeVisible = createNewHosts(elements);
    ngModule.destroy();
    makeVisible();
  });
};`);
        process.stdout.write('\nFile src/hmr.ts created');
    } catch (err) {
        process.stderr.write('\nProblem with creating file src/hmr.ts');
        process.stderr.write(`\n${err}`);
        throw err;
    }
};

const updateMainTs = () => {
    try {
        fs.writeFileSync('src/main.ts', `import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from './environments/environment';
import { hmrBootstrap } from './hmr';
import { AppModule } from './app/app.module';

const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);

if (environment.production) {
  enableProdMode();
  bootstrap().catch(err => console.log(err));
} else {
    if ((module as any).hot) {
    hmrBootstrap(module, bootstrap);
  } else {
    console.error('HMR is not enabled for webpack-dev-server!');
    console.log('Are you using the --hmr flag for ng serve?');
  }
}
`);
        process.stdout.write('\nFile src/main.ts created');
    } catch (err) {
        process.stderr.write('\nProblem with updating file src/main.ts');
        process.stderr.write(`\n${err}`);
        throw err;
    }
}

const updateAngular = () => {
    const angular = JSON.parse(fs.readFileSync('angular.json', 'UTF-8'));

    let save = true;
    const keys = Object.keys(angular.projects);
    keys.forEach(key => {
        try {
            const serve = angular.projects[key].architect.serve;
            if (serve) {
                if (!serve.options) {
                    serve.options = {};
                }
                serve.options.hmr = true;
            }
        } catch (e) {
            save = false;
            process.stderr.write(`\n${e.message}`);
        }
    });
    if (save) {
        try {
            fs.writeFileSync('angular.json', JSON.stringify(angular, null, 2));
            process.stdout.write('\nFile angular.json updated');
        } catch (err) {
            process.stderr.write('\nProblem with updating file angular.json');
            process.stdout.write('\nYou can do it by yourself');
            process.stdout.write('\nJust remove test section from all projects');
            process.stderr.write(`\n${err}`);

        }
    }
};

const updateTsConfigApp = () => {
    const tsconfigApp = JSON.parse(fs.readFileSync('src/tsconfig.app.json', 'UTF-8'));
    try {
        tsconfigApp.compilerOptions.types.push('node');
    } catch (e) {
        tsconfigApp.compilerOptions.types = ['node'];
    }

    try {
        fs.writeFileSync('src/tsconfig.app.json', JSON.stringify(tsconfigApp, null, 2));
        process.stdout.write('\nFile tsconfig.app.json updated');
    } catch (err) {
        process.stderr.write('\nProblem with updating file tsconfig.app.json');
        process.stdout.write('\nYou can do it by yourself');
        process.stdout.write('\nJust add "nodes" to compilerOptions.types');
        process.stderr.write(`\n${err}`);
    }
};

main();