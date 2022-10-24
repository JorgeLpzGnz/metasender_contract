// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/Counters.sol';
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
// delete
import "hardhat/console.sol";

contract Token721 is ERC721, Ownable {

    using Counters for Counters.Counter;

    string public baseUri;

    uint256 public mintCost;

    uint256 public maxPerTransaction = 20;

    uint256 public totalSupply = 10000;

    Counters.Counter public tokenIdCounter;

    mapping (address => bool) public whiteList;

    event MintToken721( address to, uint256 tokenId);

    event Withdraw( address to, uint256 amount);

    constructor() ERC721('Token721', 'SPC'){

        tokenIdCounter.increment();

        baseUri = '';

        mintCost = 0.1 ether;

    }

    function addToWhiteList ( address _address ) external onlyOwner {

        require( !whiteList[ _address ] , "Addres is already in the whitelist");

        whiteList[ _address ] = true;

    }

    function deleteToWhiteList ( address _address ) external onlyOwner {

        require( whiteList[ _address ], "Address not found");

        delete whiteList[ _address ];
        
    }

    function setBaseUri( string memory _baseUri) public onlyOwner{

        baseUri = _baseUri;

    }

    function tokenURI( uint256 _tokenId) public view override returns( string memory ){

        require( _exists(_tokenId), "token dosn't exist");

        return string( abi.encodePacked( baseUri, Strings.toString(_tokenId), '.json' ));

    }

    function setMintCost ( uint256 _mintCost) external {

        mintCost = _mintCost;

    }

    function mintToken721(uint256 _nftsAmount) external {

        for(uint256 i; i < _nftsAmount; i++){
            
            require( tokenIdCounter.current() <= totalSupply, 'Sold Out');

            _safeMint(msg.sender, tokenIdCounter.current());
            
            emit MintToken721(msg.sender, tokenIdCounter.current());
            
            tokenIdCounter.increment();
            
        }

    }

    function withdraw() external onlyOwner{

        uint256 balance = address(this).balance;

        require(balance > 0, 'Can not transfer: insuficent founds');

        payable(msg.sender).transfer(balance);

        emit Withdraw(msg.sender, balance);

    }


}
