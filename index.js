const fs = require('fs');
const yaml = require('js-yaml');

let file = '';
let imports = '';

const importClassRef = (className, isEnum) => {
    return 'import {' + className + (isEnum ? 'Enum' : '') + '} from \'.\/' + className.toLocaleLowerCase() + (isEnum ? '.enum' : '') + '\';\n';
};

const createEnum = (modelName, propertyName, enumValues) => {
    const enumName = modelName + propertyName[0].toUpperCase() + propertyName.substr(1);
    let enumFile = 'export enum ' + enumName + 'Enum {';
    let isFirst = true;
    for (let value of enumValues) {
        if (!isFirst) {
            enumFile += ',';
        }
        enumFile += '\n';
        isFirst = false;
        enumFile += '    ' + value.toLocaleUpperCase().replace(/ /g,'_');
        enumFile += ' = \'' + value + '\'';
    }
    enumFile += '\n}\n';
    fs.writeFile('dist/' + modelName.toLowerCase() + propertyName[0].toUpperCase() + propertyName.substr(1) + '.enum.ts', enumFile, (err) => {
        if (err) {
            console.log(err);
        }
    });
};

const getTypeName = (property) => {
    let typeName;
    switch (property.type) {
        case 'integer':
            typeName = 'number';
            break;
        case 'string':
            typeName = 'string';
            break;
        case 'boolean':
            typeName = 'boolean';
            break;
        case 'array':
            if (property.items.$ref) {
                typeName = refToOtherClass(property.items.$ref) + '[]';
                imports += importClassRef(refToOtherClass(property.items.$ref));
            } else {
                typeName = getTypeName(property.items) + '[]';
            }
            break;
        default:
            typeName = 'any';
            break;
    }
    return typeName;
};

const refToOtherClass = (classPath) => {
    return classPath.split('/')[classPath.split('/').length - 1];
};

const createModel = (model, modelName) => {
    file = 'export class ' + modelName + ' {\n';
    imports = '';
    for (let propertyName of Object.keys(model.properties)) {
        file += '    public ' + propertyName;
        if (model.properties[propertyName].enum) {
            createEnum(modelName, propertyName, model.properties[propertyName].enum);
            file += ': ' + modelName + propertyName[0].toUpperCase() + propertyName.substr(1) + 'Enum';
            imports += importClassRef(modelName + propertyName[0].toUpperCase() + propertyName.substr(1), true)
        } else {
            if (model.properties[propertyName].type) {
                file += ': ' + getTypeName(model.properties[propertyName]);
            } else if (model.properties[propertyName].$ref) {
                const className = refToOtherClass(model.properties[propertyName].$ref);
                file += ': ' + className;
                imports += importClassRef(className)
            }
            if (typeof model.properties[propertyName].default !== 'undefined') {
                file += ' = ' + model.properties[propertyName].default;
            }
        }
        file += ';\n';
    }
    file += '}\n';
    const result = imports.length > 0 ? imports + '\n' + file : file;
    fs.writeFile('dist/' + modelName[0].toLowerCase() + modelName.substr(1) + '.ts', result, (err) => {
        if (err) {
            console.log(err);
        }
    });
};

// Get document, or throw exception on error
try {
    if (!fs.existsSync('dist')) {
        fs.mkdir('dist', (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
    const doc = yaml.safeLoad(fs.readFileSync('./petstore.yaml', 'utf8'));
    for (let modelName of Object.keys(doc.definitions)) {
        createModel(doc.definitions[modelName], modelName);
    }
} catch (e) {
    console.log(e);
}
