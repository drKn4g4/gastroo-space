import re
import sys

def main():
    file_path = 'src/app/[lang]/dashboard/menu/page.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements for `item.available` -> `item.visible`
    content = content.replace('!item.available', '!item.visible')
    content = content.replace('item.available ?', 'item.visible ?')
    content = content.replace('itemForm.available', 'itemForm.visible')
    content = content.replace('available: false', 'visible: false')
    content = content.replace('available: true', 'visible: true')
    content = content.replace('{ available: !item.available }', '{ visible: !item.visible }')
    content = content.replace('available: item.available', 'visible: item.visible')
    
    # Replacements for `imageUrl`
    content = content.replace('item.imageUrl', 'item.image')
    content = content.replace('itemForm.imageUrl', 'itemForm.image')
    content = content.replace('imageUrl: url ??', 'image: url ??')
    content = content.replace('imageUrl: \'\'', 'image: \'\'')
    
    # Replacements for `dietary`
    content = content.replace('item.vegetarian', 'item.dietary?.vegetarian')
    content = content.replace('item.vegan', 'item.dietary?.vegan')
    content = content.replace('item.glutenFree', 'item.dietary?.glutenFree')
    
    # Item mapping fixes in save/edit
    content = re.sub(r'vegetarian:(.*?), vegan:(.*?), glutenFree:(.*?),', 
                     r'dietary: { vegetarian:\1, vegan:\2, glutenFree:\3 },', content)
                     
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
