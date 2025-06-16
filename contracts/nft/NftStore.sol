// SPDX-License-Identifier: Apache License 2.0
pragma solidity ^0.8.0;
import "github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.7.3/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./RoyaltyStandard.sol";

contract NftStore is ERC721Enumerable, RoyaltyStandard {
    address public _owner;
    address public _creator;
    uint256 private _feeRate;
    uint256 public _mintFee;
    mapping(uint256 => string) private _metaUrl;
    uint256 public _lastId;
    bool public _creatorOnly;

    /*
    * @param string name string Nft name
    * @param string symbol string
    * @param address creator
    * @param address feeRate Unit is %
    */
    constructor(
        string memory name,
        string memory symbol,
        address creator,
        uint256 feeRate
    ) ERC721(name, symbol) {
        _owner = msg.sender;
        _creator = creator;
        _feeRate = feeRate;
        _mintFee = 0;
        _creatorOnly = true;
    }

    /*
    * @param address to
    * @param string metaUrl
    */
    function mint(address to, string memory metaUrl) public payable {
        require(
            (!_creatorOnly || msg.sender == _creator || msg.sender == _owner),
            "Only the creator can mint this NFT"
        );
        require(msg.value >= _mintFee, "Insufficient mint fee");

        _lastId++;
        uint256 tokenId = _lastId;
        _metaUrl[tokenId] = metaUrl;
        _mint(to, tokenId);
        _setTokenRoyalty(tokenId, _creator, _feeRate * 100); // 100 = 1%
    }

    /*
     * ERC721 0x80ac58cd
     * ERC165 0x01ffc9a7 (RoyaltyStandard)
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Enumerable, RoyaltyStandard)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        _requireMinted(tokenId);
        return _metaUrl[tokenId];
    }

    function burn(uint256 tokenId) external {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "Caller is not owner nor approved"
        );
        _metaUrl[tokenId] = "";
        _burn(tokenId);
    }

    /*
        extra method
     */
    function config(
        address creator,
        uint256 feeRate,
        bool creatorOnly
    ) external {
        require(_owner == msg.sender, "Can't set. owner only");
        _creator = creator;
        _feeRate = feeRate;
        _creatorOnly = creatorOnly;
    }

    function setMintFee(uint256 mintFee) external {
        require(_owner == msg.sender, "Can't set. owner only");
        _mintFee = mintFee;
    }

    function getInfo() external view returns (address, uint256, bool) {
        return (_creator, _lastId, _creatorOnly);
    }

    function getMintFee() external view returns (uint256) {
        return _mintFee;
    }

    function withdraw() external {
        require(_owner == msg.sender || _creator == msg.sender, "Can't withdraw. owner or creator only");
        require(address(this).balance > 0, "No balance to withdraw");
        payable(msg.sender).transfer(address(this).balance);
    }

}
