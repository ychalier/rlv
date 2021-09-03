import os
from setuptools import find_packages, setup

with open(os.path.join(os.path.dirname(__file__), "README.md")) as readme:
    README = readme.read()

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

setup(
    name='rlvplan',
    version='1.0.0',
    packages=["rlvplan"],
    include_package_data=True,
    license='MIT License',
    description='A schedule generator using ILP optimization.',
    long_description=README,
    url='https://yohan.chalier.fr/',
    author='Yohan Chalier',
    author_email='yohan@chalier.fr',
    classifiers=[ ],
    install_requires=[
        "pulp",
        "xlsxwriter",
        "pyexcel-ods"
    ]
)