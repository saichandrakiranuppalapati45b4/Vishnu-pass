const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? 
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const replaceMap = [
    {
        // Replace import
        match: /import\s+\{\s*supabase\s*\}\s+from\s+['"](?:\.\.\/)+lib\/supabase['"];?/g,
        replace: "import { db } from '../../config/firebase';\nimport { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';"
    },
    {
        match: /import\s+\{\s*supabase\s*\}\s+from\s+['"](?:\.\/)+lib\/supabase['"];?/g,
        replace: "import { db } from '../config/firebase';\nimport { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';"
    }
];

let modifiedFiles = 0;

walkDir(srcDir, function(filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        
        replaceMap.forEach(r => {
            content = content.replace(r.match, r.replace);
        });

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            modifiedFiles++;
            console.log('Modified:', filePath);
        }
    }
});

console.log(`Migration script finished. Modified ${modifiedFiles} files.`);
