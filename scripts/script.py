import os
import requests
import json
import sys
cafe_names = [f.name for f in os.scandir('.') if f.is_dir()]
cafe_json = [f.name for f in os.scandir('.') if f.is_file()]
print(cafe_json)
print(cafe_names)
base_url = ""  # api endpoint route, usually http://localhost:5000/api


def uploadDish(token, name, price, description, featured, path):
    url = base_url+'/menu/withImage'
    payload = {'dish_name': name,
               'price': int(price)*100,
               'availablity': 'true',
               'description': description,
               'featured': featured}
    files = [
        ('dishImage', open(path, 'rb'))
    ]
    headers = {
        'x-auth-token': token
    }

    response = requests.request(
        "POST", url, headers=headers, data=payload, files=files)

    print(response.text.encode('utf8'))


for cafe_name in cafe_names:
    cafe_description = ''
    files = [f for f in os.listdir(
        cafe_name) if os.path.isfile(os.path.join(cafe_name, f))]
    if(os.path.exists(os.path.join(cafe_name, cafe_name.lower()+'.txt'))):
        with open(os.path.join(cafe_name, cafe_name.lower()+'.txt'), 'r', encoding='utf-8') as f:
            cafe_description = f.read()
    payload = {'name': cafe_name,
               'email': cafe_name.lower()+'@email.com',
               'password': cafe_name.lower(), 'description': cafe_description}
    files_ = []

    if(os.path.exists(os.path.join(cafe_name, 'cafe.jpg'))):
        files_.append(
            ('cafeImage', open(os.path.join(cafe_name, 'cafe.jpg'), 'rb')))
    if(os.path.exists(os.path.join(cafe_name, 'logo.jpg'))):
        files_.append(
            ('logoImage', open(os.path.join(cafe_name, 'logo.jpg'), 'rb')))
    response = requests.request(
        "POST", base_url+'/profile/register/cafe/withImage', headers={}, data=payload, files=files_)
    response_dict = json.loads(response.text)
    if not "token" in response_dict:
        print('no token found, ending script')
        sys.exit()
    token = response_dict['token']

    if cafe_name.lower()+'.json' in cafe_json:
        print('Currently working wih cafe name', cafe_name)
        with open(cafe_name+'.json', 'r', encoding='utf-8') as f:
            dishes = json.load(f)
            for dish in dishes:
                for dish_picture_name in files:
                    if os.path.splitext(dish_picture_name)[0] in dish["name"].lower():
                        print(dish['name'])
                        uploadDish(
                            token, dish['name'], dish['price'], dish['description'], dish['featured'], os.path.join(cafe_name, dish_picture_name))
