import { faArrowDown, faArrowRight, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { faClose } from '@fortawesome/free-solid-svg-icons/faClose'
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'
import axios from "axios"
const Home = () => {
    const [users, setUsers] = useState([])
    const [error, setError] = useState(null)

    useEffect(() => {
        axios
        .get('http://localhost:3000/users')
        .then(response => setUsers(response.data))
        .catch(err => {
            console.log(err.message);
            
        })
    }, [])

    const showUsers = () => {
        console.log(users);
        
    }
    return (
        <div className='h-screen bg-red-300 flex flex-col justify-center items-center text-center relative z-0'>
            {users.map(user => (
                <li key={user.id}>{user.username}</li>
            ))}
            <p>Streamline Your Downloads</p>
            <h1 className='text-6xl font-bold'>Effortlessly Download and Enjoy<br />Your YouTube Playlists</h1>
            <div className='flex bg-blue-600 w-1/2 rounded-full'>
                <div className='py-5 w-1/12 rounded-s-full flex justify-center'><FontAwesomeIcon icon={faSearch} className='text-2xl' /></div>
                <div className='w-10/12'><input type="text" className='h-full w-full px-5 text-xl' /></div>
                <div className='py-5 w-1/12 rounded-e-full flex justify-center'><FontAwesomeIcon icon={faClose} className='text-2xl' /></div>
            </div>
            <div>
                <button className='bg-blue-700'>Start <FontAwesomeIcon icon={faArrowRight} /></button>
                <button className='bg-blue-700'>Quality <FontAwesomeIcon icon={faChevronDown} /></button>
            </div>
            <div className='absolute bottom-8 w-full flex justify-between px-36'>
                <div className="flex">
                    <p>Follow Us</p>
                    <div className='flex'>
                        <p>A</p>
                        <p>A</p>
                        <p>A</p>
                        <p>A</p>
                    </div>
                </div>
                <div className='flex items-center' onClick={showUsers}>
                    <p>Scroll to explore</p><FontAwesomeIcon icon={faArrowDown} />
                </div>
            </div>
        </div>
    )
}

export default Home